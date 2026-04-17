/**
 * BehaviorEventIngest Edge Function
 * Accepts a batch of up to 20 BehaviorEvent records and bulk-upserts them
 * using last-write-wins semantics.
 * Requirements: 9.3, 9.6, 16.5
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BehaviorEvent {
  id: string;
  userId: string;
  eventType: string;
  entityId: string | null;
  sessionId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return json({ error: "Missing env vars" }, 500);

    const body = await req.json();
    const events: BehaviorEvent[] = body?.events;

    if (!Array.isArray(events) || events.length === 0) return json({ error: "events must be a non-empty array" }, 400);
    if (events.length > 20) return json({ error: "Batch size exceeds maximum of 20 events" }, 400);

    const db = createClient(supabaseUrl, supabaseKey);

    const incoming = events.map((e) => ({
      id: e.id, user_id: e.userId, event_type: e.eventType,
      entity_id: e.entityId ?? null, session_id: e.sessionId,
      timestamp: e.timestamp, metadata: e.metadata ?? {},
    }));

    // Last-write-wins: only upsert if incoming timestamp is newer (Req 16.5)
    const { data: existing } = await db.from("behavior_events").select("id, timestamp").in("id", incoming.map((r) => r.id));
    const existingMap = new Map<string, string>((existing ?? []).map((r: { id: string; timestamp: string }) => [r.id, r.timestamp]));
    const toUpsert = incoming.filter((row) => { const ts = existingMap.get(row.id); return !ts || row.timestamp > ts; });
    const skipped = incoming.length - toUpsert.length;

    if (toUpsert.length === 0) return json({ inserted: 0, skipped });

    const { error } = await db.from("behavior_events").upsert(toUpsert, { onConflict: "id" });
    if (error) return json({ error: error.message }, 500);

    return json({ inserted: toUpsert.length, skipped });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
