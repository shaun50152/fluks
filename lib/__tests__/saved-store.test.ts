/**
 * Property-based tests for stores/saved.store.ts
 *
 * Property 9: Save idempotence — calling saveEntity N times → exactly one saved_item record
 * Property 10: Save/unsave/save round-trip → exactly one record, isSaved is true
 *
 * Validates: Requirements 6.7, 6.8, 15.3
 */

import * as fc from 'fast-check';

// ── In-memory DB (mock-prefixed so jest.mock factory can access it) ──
// Models the saved_items table with a unique constraint on (user_id, entity_type, entity_id)
const mockDb = new Map<string, Record<string, unknown>>();

function mockMakeKey(userId: string, entityType: string, entityId: string) {
  return `${userId}:${entityType}:${entityId}`;
}

// ── Supabase mock ────────────────────────────────────────────────
jest.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: (_table: string) => {
        let _operation: string | null = null;
        let _upsertPayload: Record<string, string> | null = null;
        const _deleteFilter: Record<string, string> = {};

        const api: Record<string, unknown> = {
          upsert: (payload: Record<string, string>) => {
            _operation = 'upsert';
            _upsertPayload = payload;
            return api;
          },
          delete: () => {
            _operation = 'delete';
            return api;
          },
          select: () => api,
          eq: (col: string, val: string) => {
            if (_operation === 'delete') {
              _deleteFilter[col] = val;
            }
            return api;
          },
          single: () => {
            if (_operation === 'upsert' && _upsertPayload) {
              const key = `${_upsertPayload.user_id}:${_upsertPayload.entity_type}:${_upsertPayload.entity_id}`;
              if (!mockDb.has(key)) {
                mockDb.set(key, {
                  id: `id-${mockDb.size}`,
                  user_id: _upsertPayload.user_id,
                  entity_type: _upsertPayload.entity_type,
                  entity_id: _upsertPayload.entity_id,
                  created_at: new Date().toISOString(),
                });
              }
              return Promise.resolve({ data: mockDb.get(key), error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
          then: (resolve: (v: { data: unknown; error: null }) => void) => {
            if (_operation === 'delete') {
              for (const [key, row] of mockDb.entries()) {
                const matchUser = !_deleteFilter.user_id || row.user_id === _deleteFilter.user_id;
                const matchType = !_deleteFilter.entity_type || row.entity_type === _deleteFilter.entity_type;
                const matchId = !_deleteFilter.entity_id || row.entity_id === _deleteFilter.entity_id;
                if (matchUser && matchType && matchId) {
                  mockDb.delete(key);
                }
              }
              resolve({ data: null, error: null });
            } else {
              resolve({ data: null, error: null });
            }
          },
        };
        return api;
      },
    },
  };
});

// ── Auth store mock ──────────────────────────────────────────────
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ userId: 'test-user-id' }),
  },
}));

// Import store after mocks are set up
import { useSavedStore } from '@/stores/saved.store';

// ── Helpers ──────────────────────────────────────────────────────

function resetAll() {
  mockDb.clear();
  useSavedStore.setState({
    savedRecipes: [],
    savedPosts: [],
    isLoading: false,
    error: null,
  });
}

function countInDb(entityType: string, entityId: string): number {
  const key = mockMakeKey('test-user-id', entityType, entityId);
  return mockDb.has(key) ? 1 : 0;
}

// ── Property 9: Save idempotence ─────────────────────────────────
// Validates: Requirements 6.7, 15.3
describe('Property 9: Save idempotence', () => {
  beforeEach(resetAll);

  it('calling saveEntity N times results in exactly one record in the DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom<'recipe' | 'post'>('recipe', 'post'),
        fc.integer({ min: 1, max: 8 }),
        async (entityId, entityType, n) => {
          resetAll();
          const { saveEntity } = useSavedStore.getState();
          for (let i = 0; i < n; i++) {
            await saveEntity(entityType, entityId);
          }
          expect(countInDb(entityType, entityId)).toBe(1);
        }
      ),
      { numRuns: 40 }
    );
  });

  it('isSaved returns true after any number of saveEntity calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom<'recipe' | 'post'>('recipe', 'post'),
        fc.integer({ min: 1, max: 5 }),
        async (entityId, entityType, n) => {
          resetAll();
          const { saveEntity } = useSavedStore.getState();
          for (let i = 0; i < n; i++) {
            await saveEntity(entityType, entityId);
          }
          expect(useSavedStore.getState().isSaved(entityType, entityId)).toBe(true);
        }
      ),
      { numRuns: 40 }
    );
  });
});

// ── Property 10: Save/unsave/save round-trip ─────────────────────
// Validates: Requirements 6.8, 15.3
describe('Property 10: Save/unsave/save round-trip', () => {
  beforeEach(resetAll);

  it('save → unsave → save results in exactly one record and isSaved is true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom<'recipe' | 'post'>('recipe', 'post'),
        async (entityId, entityType) => {
          resetAll();
          const { saveEntity, unsaveEntity } = useSavedStore.getState();

          await saveEntity(entityType, entityId);
          await unsaveEntity(entityType, entityId);
          await saveEntity(entityType, entityId);

          expect(countInDb(entityType, entityId)).toBe(1);
          expect(useSavedStore.getState().isSaved(entityType, entityId)).toBe(true);
        }
      ),
      { numRuns: 40 }
    );
  });

  it('after unsave, isSaved returns false and DB record is removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom<'recipe' | 'post'>('recipe', 'post'),
        async (entityId, entityType) => {
          resetAll();
          const { saveEntity, unsaveEntity } = useSavedStore.getState();

          await saveEntity(entityType, entityId);
          await unsaveEntity(entityType, entityId);

          expect(useSavedStore.getState().isSaved(entityType, entityId)).toBe(false);
          expect(countInDb(entityType, entityId)).toBe(0);
        }
      ),
      { numRuns: 40 }
    );
  });
});
