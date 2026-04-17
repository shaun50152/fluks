import { create } from 'zustand';
import { enqueue, flushQueue, readQueue } from '@/lib/offline-queue';
import type { QueuedMutation } from '@/types/domain';

interface OfflineQueueState {
  queue: QueuedMutation[];
  isFlushing: boolean;
  lastFlushError: string | null;
}

interface OfflineQueueActions {
  enqueue: (mutation: Omit<QueuedMutation, 'id'>) => Promise<void>;
  flush: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

type OfflineQueueStore = OfflineQueueState & OfflineQueueActions;

export const useOfflineQueueStore = create<OfflineQueueStore>((set, get) => ({
  queue: [],
  isFlushing: false,
  lastFlushError: null,

  enqueue: async (mutation) => {
    const full: QueuedMutation = {
      ...mutation,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    };
    await enqueue(full);
    set((s) => ({ queue: [...s.queue, full] }));
  },

  flush: async () => {
    if (get().isFlushing) return;
    set({ isFlushing: true, lastFlushError: null });
    try {
      await flushQueue();
      const remaining = await readQueue();
      set({ queue: remaining, isFlushing: false });
    } catch (e: unknown) {
      set({
        isFlushing: false,
        lastFlushError: e instanceof Error ? e.message : 'Flush failed',
      });
    }
  },

  loadQueue: async () => {
    const queue = await readQueue();
    set({ queue });
  },
}));
