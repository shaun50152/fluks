/**
 * Property 29: Offline queue FIFO ordering
 *
 * Validates: Requirements 16.4
 */

import * as fc from 'fast-check';
import type { QueuedMutation } from '@/types/domain';

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
}));

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

import { enqueue, readQueue } from '../offline-queue';

const QUEUE_KEY = '@foodos/offline_queue';

function makeMutation(id: string, timestamp: string): QueuedMutation {
  return {
    id,
    type: 'behavior_event',
    payload: { eventType: 'app_open' },
    timestamp,
    retryCount: 0,
  };
}

// ── Property 29: Offline queue FIFO ordering ─────────────────────
// Validates: Requirements 16.4
describe('Property 29: Offline queue FIFO ordering', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    delete mockStorage[QUEUE_KEY];
  });

  it('mutations are stored and read back in the order they were enqueued', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            timestamp: fc.integer({ min: 1_000_000, max: 9_999_999 }).map(String),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (items) => {
          // Reset storage
          delete mockStorage[QUEUE_KEY];

          const mutations = items.map(({ id, timestamp }) => makeMutation(id, timestamp));

          // Enqueue in order
          for (const m of mutations) {
            await enqueue(m);
          }

          // Read back and verify FIFO order
          const queue = await readQueue();
          expect(queue.length).toBe(mutations.length);
          for (let i = 0; i < mutations.length; i++) {
            expect(queue[i].id).toBe(mutations[i].id);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
