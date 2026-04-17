import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  userId: null,
  isLoading: false,
  error: null,

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({
      session: data.session,
      userId: data.session?.user.id ?? null,
      isLoading: false,
      error: null,
    });
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({
      session: data.session,
      userId: data.session?.user.id ?? null,
      isLoading: false,
      error: null,
    });
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signOut();
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({ session: null, userId: null, isLoading: false, error: null });
  },

  restoreSession: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({
      session: data.session,
      userId: data.session?.user.id ?? null,
      isLoading: false,
      error: null,
    });

    // Subscribe to auth state changes so the store stays in sync
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        userId: session?.user.id ?? null,
      });
    });
  },

  refreshSession: async () => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({
      session: data.session,
      userId: data.session?.user.id ?? null,
      isLoading: false,
      error: null,
    });
  },
}));
