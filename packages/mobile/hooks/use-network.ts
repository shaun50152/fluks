import { useEffect, useRef, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useOfflineQueueStore } from '@/stores/offline-queue.store';

/**
 * Subscribes to network connectivity changes via NetInfo.
 * Returns `{ isConnected: boolean }`.
 * When connectivity transitions from false → true, flushes the offline queue.
 *
 * Requirements: 16.2, 16.4
 */
export function useNetwork(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const prevConnected = useRef<boolean>(true);
  const flush = useOfflineQueueStore((s) => s.flush);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;

      if (connected && !prevConnected.current) {
        flush();
      }

      prevConnected.current = connected;
      setIsConnected(connected);
    });

    return unsubscribe;
  }, [flush]);

  return { isConnected };
}
