import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { logEvent } from '@/lib/behavior-logger';

let Notifications: any = null;
if (Constants.appOwnership !== 'expo') {
  Notifications = require('expo-notifications');
}
import { logEvent } from '@/lib/behavior-logger';
import type { NotificationCategory } from '@/types/domain';

export interface NotificationData {
  category?: NotificationCategory;
  postId?: string;
  mealWindowId?: string;
  [key: string]: unknown;
}

export interface UseNotificationResult {
  expoPushToken: string | null;
  permissionGranted: boolean;
}

/**
 * Sets up Expo push notifications:
 * - Requests permissions and retrieves the Expo push token
 * - Handles foreground notifications via `onForegroundNotification` callback
 * - Deep-links on notification tap and logs `notification_open` BehaviorEvent
 *
 * Requirements: 12.3, 12.7, 12.8, 9.1
 */
export function useNotification(
  onForegroundNotification?: (notification: any) => void
): UseNotificationResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const router = useRouter();

  // Keep a stable ref to the callback so listeners don't need to re-register
  const onForegroundRef = useRef(onForegroundNotification);
  useEffect(() => {
    onForegroundRef.current = onForegroundNotification;
  }, [onForegroundNotification]);

  useEffect(() => {
    let receivedSub: Notifications.EventSubscription;
    let responseSub: Notifications.EventSubscription;

    async function setup() {
      if (!Notifications) {
        setPermissionGranted(false);
        setExpoPushToken(null);
        return;
      }
      
      // 1. Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setPermissionGranted(granted);

      // 2. Get Expo push token (only meaningful on a physical device, and crashes in Expo Go SDK 53+)
      if (granted && Constants.appOwnership !== 'expo') {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          setExpoPushToken(tokenData.data);
        } catch {
          // Simulator / web — token unavailable, not a fatal error
          setExpoPushToken(null);
        }
      }

      // 3. Foreground notification listener — delegate rendering to parent (req 12.7)
      receivedSub = Notifications.addNotificationReceivedListener((notification: any) => {
        onForegroundRef.current?.(notification);
      });

      // 4. Tap / response listener — deep-link + log event (req 12.3, 12.8, 9.1)
      responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = (response.notification.request.content.data ?? {}) as NotificationData;
        const notificationId = response.notification.request.identifier;

        // Log notification_open BehaviorEvent (req 9.1)
        try {
          logEvent('notification_open', notificationId);
        } catch {
          // User may not be authenticated yet — swallow silently
        }

        // Deep-link based on category (req 12.3, 12.8)
        if (data.category === 'meal_window') {
          router.push('/(tabs)');
        } else if (data.category === 'social_activity' && data.postId) {
          router.push(`/post/${data.postId}`);
        }
      });
    }

    setup();

    return () => {
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [router]);

  return { expoPushToken, permissionGranted };
}
