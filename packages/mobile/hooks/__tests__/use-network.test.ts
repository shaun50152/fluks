/**
 * Tests for hooks/use-network.ts
 *
 * Validates: Requirements 16.2, 16.4
 */

import React from 'react';
import { create, act } from 'react-test-renderer';
import { useNetwork } from '@/hooks/use-network';

// Capture the NetInfo listener so tests can simulate state changes
let netInfoListener: ((state: { isConnected: boolean | null }) => void) | null = null;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean | null }) => void) => {
      netInfoListener = cb;
      return () => {
        netInfoListener = null;
      };
    }),
  },
}));

// Helper component that exposes hook result via a ref
function TestComponent({ onResult }: { onResult: (r: { isConnected: boolean }) => void }) {
  const result = useNetwork();
  onResult(result);
  return null;
}

describe('useNetwork', () => {
  beforeEach(() => {
    netInfoListener = null;
  });

  it('returns isConnected: true by default', () => {
    let result: { isConnected: boolean } | undefined;
    act(() => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });
    expect(result?.isConnected).toBe(true);
  });

  it('updates isConnected to false when NetInfo reports disconnected', () => {
    let result: { isConnected: boolean } | undefined;
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    act(() => {
      netInfoListener?.({ isConnected: false });
    });

    expect(result?.isConnected).toBe(false);
  });

  it('updates isConnected to true when connectivity is restored', () => {
    let result: { isConnected: boolean } | undefined;
    act(() => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    act(() => { netInfoListener?.({ isConnected: false }); });
    expect(result?.isConnected).toBe(false);

    act(() => { netInfoListener?.({ isConnected: true }); });
    expect(result?.isConnected).toBe(true);
  });

  it('treats null isConnected from NetInfo as false', () => {
    let result: { isConnected: boolean } | undefined;
    act(() => {
      create(React.createElement(TestComponent, { onResult: (r) => { result = r; } }));
    });

    act(() => {
      netInfoListener?.({ isConnected: null });
    });

    expect(result?.isConnected).toBe(false);
  });

  it('unsubscribes from NetInfo on unmount', () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(TestComponent, { onResult: () => {} }));
    });
    expect(netInfoListener).not.toBeNull();

    act(() => {
      renderer.unmount();
    });
    expect(netInfoListener).toBeNull();
  });
});
