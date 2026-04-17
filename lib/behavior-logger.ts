import { useAuthStore } from '@/stores/auth.store';
import { useOfflineQueueStore } from '@/stores/offline-queue.store';
import { useScheduleStore } from '@/stores/schedule.store';
import type { EventType, BehaviorEvent } from '@/types/domain';

let sessionId: string | null = null;
let flushTimer: NodeJS.Timeout | null = null;
const pendingEvents: BehaviorEvent[] = [];

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  return sessionId;
}

/**
 * Logs a BehaviorEvent by building the event record and enqueuing it to the offline queue.
 * Triggers a batch flush when the queue reaches 20 events or after a 5-second debounce.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.6
 */
export function logEvent(
  eventType: EventType,
  entityId?: string,
  metadata?: Record<string, unknown>
): BehaviorEvent {
  const userId = useAuthStore.getState().userId;
  if (!userId) {
    throw new Error('Cannot log event: user not authenticated');
  }

  const event: BehaviorEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    userId,
    eventType,
    entityId: entityId ?? null,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    metadata: metadata ?? {},
  };

  pendingEvents.push(event);

  useOfflineQueueStore.getState().enqueue({
    type: 'behavior_event',
    payload: event,
    timestamp: event.timestamp,
    retryCount: 0,
  });

  scheduleBatchFlush();

  // Trigger schedule detector after each event (fire-and-forget)
  useScheduleStore.getState().runDetector().catch(() => {/* silent */});

  return event;
}

/**
 * Schedules a batch flush when the queue reaches 20 events or after a 5-second debounce.
 *
 * Requirements: 9.6
 */
export function scheduleBatchFlush(): void {
  if (pendingEvents.length >= 20) {
    flushNow();
    return;
  }

  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushNow();
  }, 5000);
}

function flushNow(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  useOfflineQueueStore.getState().flush();
  pendingEvents.length = 0;
}
