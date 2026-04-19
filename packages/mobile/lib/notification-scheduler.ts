/**
 * Local notification helpers wrapping expo-notifications.
 * Requirements: 12.2, 12.4
 */
import Constants from 'expo-constants';
import type { NotificationPayload } from '@/types/domain';

let Notifications: any = null;
if (Constants.appOwnership !== 'expo') {
  Notifications = require('expo-notifications');
}

/**
 * Schedules a local notification via expo-notifications.
 * Returns the notification identifier.
 */
export async function scheduleLocalNotification(payload: NotificationPayload): Promise<string> {
  if (!Notifications) return 'mock-id';
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
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
