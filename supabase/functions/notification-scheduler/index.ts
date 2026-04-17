/**
 * NotificationScheduler Edge Function
 * Invoked by Supabase cron every 15 minutes.
 *
 * Requirements: 12.2, 12.4, 12.5, 12.6
 *
 * Layer 1 — Real-time:   enqueue `meal_window_start` 10 min before each active MealWindow
 * Layer 2 — Adaptive:    if isDrifted, use last-14-day average meal time instead of stored pattern
 * Layer 3 — Anticipatory: enqueue `prep_reminder` for PrepSuggestions with target_datetime 12–24h away
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Expo from "https://esm.sh/expo-server-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationCategory =
  | "meal_window"
  | "prep_reminder"
  | "social_activity"
  | "adaptive_schedule";

interface UserNotificationSettings {
  user_id: string;
  category: NotificationCategory;
  enabled: boolean;
  quiet_hours_start: string | null; // "HH:mm"
  quiet_hours_end: string | null;   // "HH:mm"
}

interface MealWindowRow {
  id: string;
  user_id: string;
  window_name: string;
  start_time: string; // "HH:mm"
  day_of_week: number;
  schedule_pattern_id: string;
  is_drifted: boolean;
  expo_push_token: string | null;
}

interface PrepSuggestionRow {
  id: string;
  user_id: string;
  recipe_id: string;
  target_datetime: string; // ISO 8601
  expo_push_token: string | null;
  requires_defrost: boolean;
}

interface BehaviorEventRow {
  user_id: string;
  event_type: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const expo = new Expo();

/** Parse "HH:mm" into { hours, minutes } */
function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Build a Date for today at the given "HH:mm" time (UTC).
 */
function todayAt(hhmm: string, now: Date): Date {
  const { hours, minutes } = parseTime(hhmm);
  const d = new Date(now);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Check whether `now` falls within quiet hours [start, end).
 * Handles overnight windows (e.g. 22:00 – 07:00).
 */
function isQuietHours(
  now: Date,
  quietStart: string,
  quietEnd: string
): boolean {
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const { hours: sh, minutes: sm } = parseTime(quietStart);
  const { hours: eh, minutes: em } = parseTime(quietEnd);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    // Same-day window e.g. 09:00 – 22:00
    return nowMinutes >= startMin && nowMinutes < endMin;
  } else {
    // Overnight window e.g. 22:00 – 07:00
    return nowMinutes >= startMin || nowMinutes < endMin;
  }
}

/**
 * Deduplication check — Req 12.5.
 * Key = userId:category:YYYY-MM-DDTHH (hour granularity).
 * Returns true if safe to enqueue (no duplicate within 60-min window).
 */
async function shouldEnqueue(
  db: ReturnType<typeof createClient>,
  userId: string,
  category: NotificationCategory,
  windowStart: Date
): Promise<boolean> {
  const key = `${userId}:${category}:${windowStart.toISOString().slice(0, 13)}`;
  const { data, error } = await db
    .from("notification_log")
    .select("id")
    .eq("deduplication_key", key)
    .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(1);

  if (error) {
    console.error("shouldEnqueue query error:", error.message);
    return false; // fail-safe: don't spam on DB errors
  }
  return (data ?? []).length === 0;
}

/**
 * Record a sent notification in notification_log for deduplication.
 */
async function recordNotification(
  db: ReturnType<typeof createClient>,
  userId: string,
  category: NotificationCategory,
  windowStart: Date
): Promise<void> {
  const key = `${userId}:${category}:${windowStart.toISOString().slice(0, 13)}`;
  await db.from("notification_log").insert({
    user_id: userId,
    category,
    deduplication_key: key,
  });
}

/**
 * Fetch user notification settings for a given category — Req 12.6.
 * Returns null if the category is disabled or settings are missing.
 */
async function getCategorySettings(
  db: ReturnType<typeof createClient>,
  userId: string,
  category: NotificationCategory
): Promise<UserNotificationSettings | null> {
  const { data, error } = await db
    .from("user_notification_settings")
    .select("user_id, category, enabled, quiet_hours_start, quiet_hours_end")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.enabled) return null; // category disabled
  return data as UserNotificationSettings;
}

/**
 * Compute the average meal time (UTC hour + minute) from the last 14 days
 * of `meal_completed` / `app_open` events for a given user.
 * Returns null if there are fewer than 3 events.
 */
async function getAverageMealTime(
  db: ReturnType<typeof createClient>,
  userId: string,
  now: Date
): Promise<{ hours: number; minutes: number } | null> {
  const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("behavior_events")
    .select("timestamp")
    .eq("user_id", userId)
    .in("event_type", ["meal_completed", "app_open"])
    .gt("timestamp", cutoff);

  if (error || !data || data.length < 3) return null;

  const totalMinutes = (data as BehaviorEventRow[]).reduce((sum, e) => {
    const d = new Date(e.timestamp);
    return sum + d.getUTCHours() * 60 + d.getUTCMinutes();
  }, 0);

  const avg = Math.round(totalMinutes / data.length);
  return { hours: Math.floor(avg / 60) % 24, minutes: avg % 60 };
}

/**
 * Send a push notification via Expo Push API.
 */
async function sendPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    console.warn("Invalid Expo push token:", token);
    return;
  }
  const messages = [{ to: token, title, body, data }];
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("Expo push error:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Layer 1 — Real-time meal_window_start (Req 12.2)
// ---------------------------------------------------------------------------

async function processLayer1(
  db: ReturnType<typeof createClient>,
  now: Date
): Promise<void> {
  // Fetch active MealWindows joined with schedule_patterns and user push tokens.
  // "Active" = today's day_of_week, and window starts within the next 10–25 min
  // (we run every 15 min, so a 25-min lookahead avoids missing a window).
  const dayOfWeek = now.getUTCDay();
  const lookaheadMs = 25 * 60 * 1000;
  const minMs = 10 * 60 * 1000; // must be at least 10 min away

  const { data: windows, error } = await db
    .from("meal_windows")
    .select(
      `id, window_name, start_time, day_of_week,
       schedule_patterns!inner(user_id, is_drifted),
       profiles!inner(expo_push_token)`
    )
    .eq("day_of_week", dayOfWeek);

  if (error) {
    console.error("Layer 1 query error:", error.message);
    return;
  }

  for (const row of windows ?? []) {
    const userId: string = (row as any).schedule_patterns.user_id;
    const isDrifted: boolean = (row as any).schedule_patterns.is_drifted ?? false;
    const pushToken: string | null = (row as any).profiles.expo_push_token;

    if (!pushToken) continue;

    // Req 12.6 — check category enabled
    const settings = await getCategorySettings(db, userId, "meal_window");
    if (!settings) continue;

    // Quiet hours check (Req 17.4)
    if (
      settings.quiet_hours_start &&
      settings.quiet_hours_end &&
      isQuietHours(now, settings.quiet_hours_start, settings.quiet_hours_end)
    ) {
      continue;
    }

    let windowStart: Date;

    if (isDrifted) {
      // Layer 2 — use last-14-day average meal time instead of stored pattern
      const avg = await getAverageMealTime(db, userId, now);
      if (avg) {
        windowStart = new Date(now);
        windowStart.setUTCHours(avg.hours, avg.minutes, 0, 0);
      } else {
        windowStart = todayAt(row.start_time, now);
      }
    } else {
      windowStart = todayAt(row.start_time, now);
    }

    const msUntilWindow = windowStart.getTime() - now.getTime();
    if (msUntilWindow < minMs || msUntilWindow > lookaheadMs) continue;

    // Deduplication — Req 12.5
    const notifyAt = new Date(windowStart.getTime() - 10 * 60 * 1000);
    const canSend = await shouldEnqueue(db, userId, "meal_window", windowStart);
    if (!canSend) continue;

    await sendPush(
      pushToken,
      "Time to eat 🍽️",
      `Your ${row.window_name} window starts in 10 minutes.`,
      { category: "meal_window", windowId: row.id, scheduledFor: notifyAt.toISOString() }
    );

    await recordNotification(db, userId, "meal_window", windowStart);
  }
}

// ---------------------------------------------------------------------------
// Layer 3 — Anticipatory prep_reminder (Req 12.4)
// ---------------------------------------------------------------------------

async function processLayer3(
  db: ReturnType<typeof createClient>,
  now: Date
): Promise<void> {
  const minAhead = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
  const maxAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: suggestions, error } = await db
    .from("prep_suggestions")
    .select(
      `id, user_id, recipe_id, target_datetime, requires_defrost,
       profiles!inner(expo_push_token)`
    )
    .gte("target_datetime", minAhead)
    .lte("target_datetime", maxAhead)
    .is("dismissed_at", null)
    .is("confirmed_at", null);

  if (error) {
    console.error("Layer 3 query error:", error.message);
    return;
  }

  for (const row of suggestions ?? []) {
    const userId: string = row.user_id;
    const pushToken: string | null = (row as any).profiles.expo_push_token;

    if (!pushToken) continue;
    if (!row.requires_defrost) continue; // only defrost-required tasks per Req 12.4

    // Req 12.6 — check category enabled
    const settings = await getCategorySettings(db, userId, "prep_reminder");
    if (!settings) continue;

    // Quiet hours check
    if (
      settings.quiet_hours_start &&
      settings.quiet_hours_end &&
      isQuietHours(now, settings.quiet_hours_start, settings.quiet_hours_end)
    ) {
      continue;
    }

    const targetDate = new Date(row.target_datetime);

    // Deduplication — Req 12.5
    const canSend = await shouldEnqueue(db, userId, "prep_reminder", targetDate);
    if (!canSend) continue;

    await sendPush(
      pushToken,
      "Prep reminder 🧊",
      `Don't forget to defrost for your meal tomorrow. Start now to be ready in time.`,
      { category: "prep_reminder", suggestionId: row.id, targetDatetime: row.target_datetime }
    );

    await recordNotification(db, userId, "prep_reminder", targetDate);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = createClient(supabaseUrl, supabaseKey);
    const now = new Date();

    await Promise.all([
      processLayer1(db, now), // Layer 1 + Layer 2 (drift handling is inline)
      processLayer3(db, now),
    ]);

    return new Response(
      JSON.stringify({ ok: true, processedAt: now.toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("NotificationScheduler fatal error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
