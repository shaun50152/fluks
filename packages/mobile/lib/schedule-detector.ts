import type { BehaviorEvent, MealWindow, SchedulePattern } from '@/types/domain';

// ── Types ────────────────────────────────────────────────────────

export interface EventCluster {
  dayOfWeek: number;
  windowName: string;
  avgHour: number;
  avgMinute: number;
  eventCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────

/** Returns the 2-hour bucket index (0–11) for a given hour (0–23). */
function timeBucket(hour: number): number {
  return Math.floor(hour / 2);
}

/** Formats a number as a zero-padded 2-digit string. */
function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

/** Converts "HH:mm" to total minutes since midnight. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Converts total minutes since midnight to "HH:mm". */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${pad2(h)}:${pad2(m)}`;
}

/** Maps an average hour to a meal window name. */
function hourToWindowName(avgHour: number): string {
  if (avgHour >= 6 && avgHour < 10) return 'breakfast';
  if (avgHour >= 11 && avgHour < 15) return 'lunch';
  if (avgHour >= 17 && avgHour < 22) return 'dinner';
  return 'snack';
}

/** Checks whether a cluster overlaps with any manually-overridden MealWindow on the same day. */
function isManualOverride(cluster: EventCluster, existingWindows: MealWindow[]): boolean {
  return existingWindows.some(
    (w) =>
      w.isManualOverride &&
      w.dayOfWeek === cluster.dayOfWeek &&
      w.windowName === cluster.windowName,
  );
}

// ── Core Functions ───────────────────────────────────────────────

/**
 * Groups BehaviorEvents into 2-hour time-slot buckets per day-of-week.
 * Only considers app_open, meal_completed, and cook_now events.
 */
export function clusterByDayAndTimeSlot(events: BehaviorEvent[]): EventCluster[] {
  const relevant = events.filter((e) =>
    ['app_open', 'meal_completed', 'cook_now'].includes(e.eventType),
  );

  // Map: "dayOfWeek:bucket" → { hours[], minutes[] }
  const bucketMap = new Map<string, { hours: number[]; minutes: number[] }>();

  for (const event of relevant) {
    const date = new Date(event.timestamp);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const hour = date.getHours();
    const minute = date.getMinutes();
    const bucket = timeBucket(hour);
    const key = `${dayOfWeek}:${bucket}`;

    if (!bucketMap.has(key)) {
      bucketMap.set(key, { hours: [], minutes: [] });
    }
    const entry = bucketMap.get(key)!;
    entry.hours.push(hour);
    entry.minutes.push(minute);
  }

  const clusters: EventCluster[] = [];

  for (const [key, { hours, minutes }] of bucketMap.entries()) {
    const [dayStr] = key.split(':');
    const dayOfWeek = Number(dayStr);
    const avgHour = hours.reduce((s, h) => s + h, 0) / hours.length;
    const avgMinute = minutes.reduce((s, m) => s + m, 0) / minutes.length;
    const windowName = hourToWindowName(avgHour);

    clusters.push({
      dayOfWeek,
      windowName,
      avgHour,
      avgMinute,
      eventCount: hours.length,
    });
  }

  return clusters;
}

/**
 * Maps an EventCluster to a MealWindow.
 * The window spans ±1 hour around the average time (2-hour window total).
 */
export function clusterToMealWindow(cluster: EventCluster): MealWindow {
  const centerMinutes = cluster.avgHour * 60 + cluster.avgMinute;
  const startMinutes = Math.max(0, centerMinutes - 60);
  const endMinutes = Math.min(23 * 60 + 59, centerMinutes + 60);

  return {
    id: `derived-${cluster.dayOfWeek}-${cluster.windowName}`,
    schedulePatternId: '',
    dayOfWeek: cluster.dayOfWeek,
    windowName: cluster.windowName,
    startTime: minutesToTime(startMinutes),
    endTime: minutesToTime(endMinutes),
    isManualOverride: false,
  };
}

/**
 * Derives MealWindow records from BehaviorEvents over a rolling window.
 * - Filters to app_open, meal_completed, cook_now events within the last `windowDays` days
 * - Clusters by day-of-week + 2-hour bucket
 * - Keeps clusters with ≥5 events
 * - Skips clusters that match a manually-overridden window
 */
export function deriveSchedulePattern(
  events: BehaviorEvent[],
  existingWindows: MealWindow[],
  windowDays = 14,
): MealWindow[] {
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const relevant = events.filter(
    (e) =>
      ['app_open', 'meal_completed', 'cook_now'].includes(e.eventType) &&
      new Date(e.timestamp).getTime() >= cutoffMs,
  );

  const clusters = clusterByDayAndTimeSlot(relevant);

  return clusters
    .filter((c) => c.eventCount >= 5)
    .filter((c) => !isManualOverride(c, existingWindows))
    .map(clusterToMealWindow);
}

/**
 * Resolves overlapping MealWindows per day-of-week.
 * Sorts by start_time, then merges overlapping intervals.
 * When two windows overlap, the one with the earlier start time is kept as-is
 * and the later window's start is pushed to the earlier window's end.
 * Guarantees: for all (w1, w2) on same day, w1.endTime <= w2.startTime.
 */
export function resolveOverlaps(windows: MealWindow[]): MealWindow[] {
  // Group by day
  const byDay = new Map<number, MealWindow[]>();
  for (const w of windows) {
    if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, []);
    byDay.get(w.dayOfWeek)!.push(w);
  }

  const result: MealWindow[] = [];

  for (const [, dayWindows] of byDay.entries()) {
    // Sort by start_time ascending
    const sorted = [...dayWindows].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );

    const merged: MealWindow[] = [];

    for (const current of sorted) {
      if (merged.length === 0) {
        merged.push({ ...current });
        continue;
      }

      const prev = merged[merged.length - 1];
      const prevEnd = timeToMinutes(prev.endTime);
      const currStart = timeToMinutes(current.startTime);
      const currEnd = timeToMinutes(current.endTime);

      if (currStart < prevEnd) {
        // Overlap: push current window's start to prev's end
        const newStart = prevEnd;
        if (newStart < currEnd) {
          merged.push({ ...current, startTime: minutesToTime(newStart) });
        }
        // If newStart >= currEnd, the window is fully consumed — drop it
      } else {
        merged.push({ ...current });
      }
    }

    result.push(...merged);
  }

  return result;
}

/**
 * Detects whether actual meal times have drifted from the stored pattern.
 * Returns true when:
 * - There are at least `minEvents` relevant events
 * - The average deviation from the nearest MealWindow exceeds `thresholdMinutes`
 */
export function detectDrift(
  actual: BehaviorEvent[],
  pattern: SchedulePattern,
  thresholdMinutes = 90,
  minEvents = 5,
): boolean {
  const relevant = actual.filter((e) =>
    ['app_open', 'meal_completed', 'cook_now'].includes(e.eventType),
  );

  if (relevant.length < minEvents) return false;

  const deviations: number[] = [];

  for (const event of relevant) {
    const date = new Date(event.timestamp);
    const dayOfWeek = date.getDay();
    const eventMinutes = date.getHours() * 60 + date.getMinutes();

    // Find MealWindows for this day
    const dayWindows = pattern.mealWindows.filter((w) => w.dayOfWeek === dayOfWeek);
    if (dayWindows.length === 0) continue;

    // Compute deviation from nearest window center
    let minDeviation = Infinity;
    for (const w of dayWindows) {
      const startMin = timeToMinutes(w.startTime);
      const endMin = timeToMinutes(w.endTime);
      const centerMin = (startMin + endMin) / 2;
      const deviation = Math.abs(eventMinutes - centerMin);
      if (deviation < minDeviation) minDeviation = deviation;
    }

    deviations.push(minDeviation);
  }

  if (deviations.length < minEvents) return false;

  const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length;
  return avgDeviation > thresholdMinutes;
}
