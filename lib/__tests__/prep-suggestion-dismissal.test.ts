/**
 * Property-based tests for PrepSuggestion dismissal suppression
 *
 * Property 32: PrepSuggestion dismissal suppression
 * Dismissed suggestion + re-query within 24h → suggestion absent from results
 *
 * Validates: Requirements 8.7
 */

import * as fc from 'fast-check';

// ── Pure filter function extracted from app/(tabs)/prep.tsx ──────

/**
 * Filters out suggestions dismissed within the last 24 hours.
 * Mirrors the belt-and-suspenders client-side filter in PrepScreen.
 */
export function filterDismissedSuggestions<T extends { dismissed_at: string | null | undefined }>(
  rows: T[],
  now: number,
): T[] {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    if (!row.dismissed_at) return true;
    return new Date(row.dismissed_at).getTime() < cutoff;
  });
}

// ── Property 32: dismissed within 24h → absent from results ─────
// Validates: Requirements 8.7
describe('Property 32: PrepSuggestion dismissal suppression', () => {
  it('suggestion dismissed within the last 24h is absent from filtered results', () => {
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        // Generate a dismissed_at timestamp strictly within (now - 24h, now]
        fc.integer({ min: now - twentyFourHoursMs + 1, max: now }),
        (dismissedAtMs) => {
          const row = { id: 'suggestion-1', dismissed_at: new Date(dismissedAtMs).toISOString() };
          const result = filterDismissedSuggestions([row], now);
          expect(result).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('suggestion dismissed more than 24h ago is present in filtered results', () => {
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    fc.assert(
      fc.property(
        // Generate a dismissed_at timestamp strictly older than 24h
        fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now - twentyFourHoursMs - 1 }),
        (dismissedAtMs) => {
          const row = { id: 'suggestion-1', dismissed_at: new Date(dismissedAtMs).toISOString() };
          const result = filterDismissedSuggestions([row], now);
          expect(result).toHaveLength(1);
          expect(result[0].id).toBe('suggestion-1');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('suggestion with no dismissed_at is always present', () => {
    const now = Date.now();
    const row = { id: 'suggestion-2', dismissed_at: null };
    const result = filterDismissedSuggestions([row], now);
    expect(result).toHaveLength(1);
  });
});
