import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

function createSupabaseClient(): SupabaseClient {
  // On web during SSR (Node.js), neither AsyncStorage nor localStorage is available.
  // Use an in-memory no-op storage so the client can be constructed safely.
  const isSSR = typeof window === 'undefined';

  if (isSSR) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: {
          getItem: () => Promise.resolve(null),
          setItem: () => Promise.resolve(),
          removeItem: () => Promise.resolve(),
        },
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  if (Platform.OS === 'web') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }

  // Native (iOS / Android)
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();
