/**
 * Property-based tests for lib/schedule-detector.ts
 *
 * Property 11: SchedulePattern non-overlap invariant
 * Property 12: Manual MealWindow override preservation
 * Property 13: Drift detection threshold
 *
 * Validates: Requirements 7.3, 7.4, 7.6, 7.7
 */

import * as fc from 'fast-check';
import {
  deriveSchedulePattern,
  resolveOverlaps,
  detectDrift,
  clusterByDayAndTimeSlot,
} from '../schedule-detector';
import type { BehaviorEvent, MealWindow, SchedulePattern } from '@/types/domain';

// ── Helpers ──────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function makeMealWindow(overrides: Partial<MealWindow> = {}): MealWindow {
  return {
    id: 'mw-1',
    schedulePatternId: 'sp-1',
    dayOfWeek: 1,
    windowName: 'lunch',
    startTime: '12:00',
    endTime: '13:00',
    isManualOverride: false,
    ...overrides,
  };
}

function makeSchedulePattern(windows: MealWindow[]): SchedulePattern {
  return {
    id: 'sp-1',
    userId: 'user-1',
    context: 'default',
    mealWindows: windows,
    isDrifted: false,
    isManual: false,
    updatedAt: new Date().toISOString(),
  };
}

// ── Arbitraries ──────────────────────────────────────────────────

const EVENT_TYPES = ['app_open', 'meal_completed', 'cook_now'] as const;

/** Generates a valid BehaviorEvent with a timestamp within the last 14 days. */
const behaviorEventArb = (): fc.Arbitrary<BehaviorEvent> => {
  const now = Date.now();
  const cutoff = now - 14 * 24 * 60 * 60 * 1000;
  return fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    eventType: fc.constantFrom(...EVENT_TYPES),
    entityId: fc.constant(null),
    sessionId: fc.uuid(),
    timestamp: fc.integer({ min: cutoff, max: now }).map((ts) => new Date(ts).toISOString()),
    metadata: fc.constant({}),
  });
};

// ── Property 11: SchedulePattern non-overlap invariant ───────────
// Validates: Requirements 7.3, 7.4
describe('Property 11: SchedulePattern non-overlap invariant', () => {
  it('deriveSchedulePattern + resolveOverlaps produces windows with no same-day overlaps', () => {
    fc.assert(
      fc.property(
        fc.array(behaviorEventArb(), { minLength: 0, maxLength: 50 }),
        (events) => {
          const derived = deriveSchedulePattern(events, []);
          const resolved = resolveOverlaps(derived);

          // Group by day
          const byDay = new Map<number, MealWindow[]>();
          for (const w of resolved) {
            if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, []);
            byDay.get(w.dayOfWeek)!.push(w);
          }

          for (const [, dayWindows] of byDay.entries()) {
            // Sort by start time
            const sorted = [...dayWindows].sort(
              (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
            );

            for (let i = 0; i < sorted.length - 1; i++) {
              const current = sorted[i];
              const next = sorted[i + 1];
              const currentEnd = timeToMinutes(current.endTime);
              const nextStart = timeToMinutes(next.startTime);
              // No overlap: current must end at or before next starts
              expect(currentEnd).toBeLessThanOrEqual(nextStart);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 12: Manual MealWindow override preservation ─────────
// Validates: Requirements 7.6
describe('Property 12: Manual MealWindow override preservation', () => {
  it('manually set window is not overwritten by deriveSchedulePattern', () => {
    fc.assert(
      fc.property(
        fc.array(behaviorEventArb(), { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 0, max: 6 }),
        fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack'),
        (events, dayOfWeek, windowName) => {
          const manualWindow = makeMealWindow({
            id: 'manual-override',
            dayOfWeek,
            windowName,
            startTime: '12:00',
            endTime: '13:00',
            isManualOverride: true,
          });

          const derived = deriveSchedulePattern(events, [manualWindow]);

          // The manual window should NOT appear in the derived output
          // (it is preserved/skipped, not overwritten)
          const overwritten = derived.find(
            (w) =>
              w.dayOfWeek === manualWindow.dayOfWeek &&
              w.windowName === manualWindow.windowName,
          );

          expect(overwritten).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 13: Drift detection threshold ───────────────────────
// Validates: Requirements 7.7
describe('Property 13: Drift detection threshold', () => {
  it('≥5 events with avg deviation >90 min from window center → detectDrift returns true', () => {
    fc.assert(
      fc.property(
        // Generate 5–20 events, each placed far from the window center
        fc.integer({ min: 5, max: 20 }),
        (eventCount) => {
          // Build a reference Date at local 06:00 on a known day.
          // We use a real Date object so getDay()/getHours() are consistent.
          // Start from 2025-01-08 and find the local 06:00 epoch for that date.
          const refDate = new Date(2025, 0, 8, 6, 0, 0); // local 06:00 Jan 8 2025
          const dayOfWeek = refDate.getDay();

          // Events are at local 06:00 (360 min). Window center is at 21:00 (1260 min).
          // Deviation = |360 - 1260| = 900 min >> 90 min threshold.
          const events: BehaviorEvent[] = Array.from({ length: eventCount }, (_, i) => ({
            id: `evt-${i}`,
            userId: 'user-1',
            eventType: 'meal_completed' as const,
            entityId: null,
            sessionId: 'session-1',
            // Spread events by 1 minute each — all stay at local 06:0x, same day
            timestamp: new Date(refDate.getTime() + i * 60000).toISOString(),
            metadata: {},
          }));

          // Pattern has a single window centered at 21:00 on the same day
          const pattern = makeSchedulePattern([
            makeMealWindow({
              dayOfWeek,
              windowName: 'dinner',
              startTime: '20:00',
              endTime: '22:00', // center = 21:00 = 1260 min
              isManualOverride: false,
            }),
          ]);

          const result = detectDrift(events, pattern);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
