/**
 * Local notification helpers wrapping expo-notifications.
 * Requirements: 12.2, 12.4
 */
import * as Notifications from 'expo-notifications';
import type { NotificationPayload } from '@/types/domain';

/**
 * Schedules a local notification via expo-notifications.
 * Returns the notification identifier.
 */
export async function scheduleLocalNotification(payload: NotificationPayload): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(payload.scheduledFor),
    },
  });
  return identifier;
}

/**
 * Cancels a previously scheduled local notification by its identifier.
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
