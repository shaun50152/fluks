import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { QueuedMutation } from '@/types/domain';

const QUEUE_KEY = '@foodos/offline_queue';

/** Appends a mutation to the AsyncStorage queue. */
export async function enqueue(mutation: QueuedMutation): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: QueuedMutation[] = raw ? JSON.parse(raw) : [];
  queue.push(mutation);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Reads the current queue from AsyncStorage. */
export async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Removes successfully sent mutations from the queue. */
async function removeFromQueue(ids: string[]): Promise<void> {
  const queue = await readQueue();
  const remaining = queue.filter((m) => !ids.includes(m.id));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

/** Increments retryCount for failed mutations. */
async function incrementRetry(ids: string[]): Promise<void> {
  const queue = await readQueue();
  const updated = queue.map((m) =>
    ids.includes(m.id) ? { ...m, retryCount: m.retryCount + 1 } : m
  );
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

/**
 * Retries a function with exponential backoff for 5xx errors.
 * Requirements: 18.7
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const isRetryable =
        err instanceof Error && /5\d\d|network|fetch/i.test(err.message);
      if (!isRetryable || attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastError;
}

/**
 * Flushes the offline queue in FIFO order, batching behavior events in groups of 20.
 * Requirements: 9.7, 16.3, 16.4, 16.5
 */
export async function flushQueue(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  const behaviorEvents = queue.filter((m) => m.type === 'behavior_event');
  const otherMutations = queue.filter((m) => m.type !== 'behavior_event');

  // Flush behavior events in batches of 20
  for (let i = 0; i < behaviorEvents.length; i += 20) {
    const batch = behaviorEvents.slice(i, i + 20);
    const batchIds = batch.map((m) => m.id);
    try {
      await withRetry(async () => {
        const { error } = await supabase.functions.invoke('behavior-event-ingest', {
          body: { events: batch.map((m) => m.payload) },
        });
        if (error) throw new Error(error.message);
      });
      await removeFromQueue(batchIds);
    } catch {
      await incrementRetry(batchIds);
    }
  }

  // Flush other mutations (pantry, saved items) individually
  for (const mutation of otherMutations) {
    try {
      await withRetry(async () => {
        if (mutation.type === 'pantry_add') {
          const { error } = await supabase.from('pantry_items').insert(mutation.payload as object);
          if (error) throw new Error(error.message);
        } else if (mutation.type === 'pantry_remove') {
          const { error } = await supabase.from('pantry_items').delete().eq('id', (mutation.payload as { id: string }).id);
          if (error) throw new Error(error.message);
        } else if (mutation.type === 'saved_item_add') {
          const { error } = await supabase.from('saved_items').upsert(mutation.payload as object);
          if (error) throw new Error(error.message);
        } else if (mutation.type === 'saved_item_remove') {
          const { error } = await supabase.from('saved_items').delete().eq('id', (mutation.payload as { id: string }).id);
          if (error) throw new Error(error.message);
        }
      });
      await removeFromQueue([mutation.id]);
    } catch {
      await incrementRetry([mutation.id]);
    }
  }
}
