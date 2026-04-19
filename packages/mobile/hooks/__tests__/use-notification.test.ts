/**
 * Tests for hooks/use-notification.ts
 *
 * Validates: Requirements 12.3, 12.7, 12.8, 9.1
 */

import React from 'react';
import { create, act } from 'react-test-renderer';
import { useNotification } from '@/hooks/use-notification';

// ── Mocks ────────────────────────────────────────────────────────────────────

let receivedListener: ((n: unknown) => void) | null = null;
let responseListener: ((r: unknown) => void) | null = null;

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-token]' }),
  addNotificationReceivedListener: jest.fn((cb: (n: unknown) => void) => {
    receivedListener = cb;
    return { remove: jest.fn(() => { receivedListener = null; }) };
  }),
  addNotificationResponseReceivedListener: jest.fn((cb: (r: unknown) => void) => {
    responseListener = cb;
    return { remove: jest.fn(() => { responseListener = null; }) };
  }),
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLogEvent = jest.fn();
jest.mock('@/lib/behavior-logger', () => ({
  logEvent: (...args: unknown[]) => mockLogEvent(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeNotification(data: Record<string, unknown>, id = 'notif-1') {
  return {
    request: {
      identifier: id,
      content: { data },
    },
  };
}

function makeResponse(data: Record<string, unknown>, id = 'notif-1') {
  return { notification: makeNotification(data, id) };
}

function TestComponent({
  onResult,
  onForeground,
}: {
  onResult: (r: { expoPushToken: string | null; permissionGranted: boolean }) => void;
  onForeground?: (n: unknown) => void;
}) {
  const result = useNotification(onForeground);
  onResult(result);
  return null;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useNotification', () => {
  beforeEach(() => {
    receivedListener = null;
    responseListener = null;
    mockPush.mockClear();
    mockLogEvent.mockClear();
  });

  it('requests permissions on mount and returns permissionGranted: true', async () => {
    const Notifications = require('expo-notifications');
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });

    let result: { expoPushToken: string | null; permissionGranted: boolean } | undefined;
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(result?.permissionGranted).toBe(true);
  });

  it('returns permissionGranted: false when permission is denied', async () => {
    const Notifications = require('expo-notifications');
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    let result: { expoPushToken: string | null; permissionGranted: boolean } | undefined;
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    expect(result?.permissionGranted).toBe(false);
  });

  it('retrieves and returns the Expo push token when permission is granted', async () => {
    const Notifications = require('expo-notifications');
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });

    let result: { expoPushToken: string | null; permissionGranted: boolean } | undefined;
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    expect(result?.expoPushToken).toBe('ExponentPushToken[abc]');
  });

  it('returns expoPushToken: null when token fetch fails (e.g. simulator)', async () => {
    const Notifications = require('expo-notifications');
    Notifications.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockRejectedValue(new Error('Not a device'));

    let result: { expoPushToken: string | null; permissionGranted: boolean } | undefined;
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    expect(result?.expoPushToken).toBeNull();
  });

  it('calls onForegroundNotification when a notification is received in foreground (req 12.7)', async () => {
    const onForeground = jest.fn();
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: () => {}, onForeground }));
    });

    const notification = makeNotification({ category: 'meal_window' });
    act(() => { receivedListener?.(notification); });

    expect(onForeground).toHaveBeenCalledWith(notification);
  });

  it('navigates to /(tabs)/ when meal_window notification is tapped (req 12.3)', async () => {
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: () => {} }));
    });

    act(() => {
      responseListener?.(makeResponse({ category: 'meal_window' }, 'notif-mw'));
    });

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/');
  });

  it('navigates to /post/:id when social_activity notification is tapped (req 12.8)', async () => {
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: () => {} }));
    });

    act(() => {
      responseListener?.(makeResponse({ category: 'social_activity', postId: 'post-42' }, 'notif-sa'));
    });

    expect(mockPush).toHaveBeenCalledWith('/post/post-42');
  });

  it('does not navigate for social_activity without a postId', async () => {
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: () => {} }));
    });

    act(() => {
      responseListener?.(makeResponse({ category: 'social_activity' }, 'notif-no-post'));
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('logs notification_open BehaviorEvent with notification id on tap (req 9.1)', async () => {
    await act(async () => {
      create(React.createElement(TestComponent, { onResult: () => {} }));
    });

    act(() => {
      responseListener?.(makeResponse({ category: 'meal_window' }, 'notif-log-test'));
    });

    expect(mockLogEvent).toHaveBeenCalledWith('notification_open', 'notif-log-test');
  });

  it('removes listeners on unmount', async () => {
    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(React.createElement(TestComponent, { onResult: () => {} }));
    });

    expect(receivedListener).not.toBeNull();
    expect(responseListener).not.toBeNull();

    act(() => { renderer.unmount(); });

    expect(receivedListener).toBeNull();
    expect(responseListener).toBeNull();
  });
});
