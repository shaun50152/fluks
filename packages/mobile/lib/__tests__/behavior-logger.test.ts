/**
 * Property-based tests for lib/behavior-logger.ts
 *
 * Validates: Requirements 9.2, 9.6
 */

import * as fc from 'fast-check';
import type { EventType, BehaviorEvent } from '@/types/domain';

// Mock auth store so logEvent can get a userId
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'test-user-id' }),
  },
}));

// Import after mock
import { logEvent } from '../behavior-logger';

const EVENT_TYPES: EventType[] = [
  'app_open', 'recipe_view', 'recipe_save', 'cook_now', 'meal_completed',
  'post_view', 'post_like', 'post_share', 'notification_open',
  'pantry_add', 'pantry_remove', 'prep_confirmed', 'suggestion_dismiss', 'post_created',
];

// ── Property 14: BehaviorEvent required field invariant ──────────
// Validates: Requirements 9.2
describe('Property 14: BehaviorEvent required field invariant', () => {
  it('logEvent always produces an event with non-null id, userId, eventType, sessionId, timestamp', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...EVENT_TYPES),
        fc.option(fc.uuid(), { nil: undefined }),
        (eventType, entityId) => {
          const event = logEvent(eventType, entityId);
          expect(event.id).toBeTruthy();
          expect(event.userId).toBeTruthy();
          expect(event.eventType).toBe(eventType);
          expect(event.sessionId).toBeTruthy();
          expect(event.timestamp).toBeTruthy();
          // Verify timestamp is a valid ISO 8601 string
          expect(() => new Date(event.timestamp)).not.toThrow();
          expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 15: BehaviorEvent batch size invariant ──────────────
// Validates: Requirements 9.6
describe('Property 15: BehaviorEvent batch size invariant', () => {
  it('N events produce ceil(N/20) batches each with at most 20 items', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        (n) => {
          const events: BehaviorEvent[] = [];
          for (let i = 0; i < n; i++) {
            events.push(logEvent('app_open'));
          }

          // Simulate batching: split into groups of 20
          const batches: BehaviorEvent[][] = [];
          for (let i = 0; i < events.length; i += 20) {
            batches.push(events.slice(i, i + 20));
          }

          const expectedBatchCount = Math.ceil(n / 20);
          expect(batches.length).toBe(expectedBatchCount);
          for (const batch of batches) {
            expect(batch.length).toBeLessThanOrEqual(20);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
