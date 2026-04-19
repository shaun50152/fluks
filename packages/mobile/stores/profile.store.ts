import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { validatePersona, validateDietaryTag, safeDeserialize } from '@/lib/validator';
import type { Profile, Persona, Goal, DietaryTag } from '@/types/domain';

// ── DB row → domain model ────────────────────────────────────────
function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    persona: row.persona as Persona,
    goals: (row.goals as Goal[]) ?? [],
    dietaryTags: (row.dietary_tags as DietaryTag[]) ?? [],
    onboarded: row.onboarded as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Patch type for upsert ────────────────────────────────────────
interface ProfilePatch {
  persona?: Persona;
  goals?: Goal[];
  dietary_tags?: DietaryTag[];
  onboarded?: boolean;
}

// ── Store types ──────────────────────────────────────────────────
interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

interface ProfileActions {
  fetchProfile: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  setPersona: (persona: Persona) => Promise<void>;
  setGoals: (goals: Goal[]) => Promise<void>;
  setDietaryTags: (tags: DietaryTag[]) => Promise<void>;
  markOnboarded: () => Promise<void>;
}

type ProfileStore = ProfileState & ProfileActions;

// ── Store ────────────────────────────────────────────────────────
export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;

    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // No profile exists or table is missing, this is a new user who just verified their email!
      set({
        profile: {
          id: userId,
          persona: null as any,
          goals: [],
          dietaryTags: [],
          onboarded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isLoading: false,
        error: error.message,
      });
      return;
    }

    const safeData = safeDeserialize<Record<string, unknown> | null>(data, null);
    set({
      profile: safeData ? rowToProfile(safeData) : null,
      isLoading: false,
      error: null,
    });
  },

  updateProfile: async (patch: ProfilePatch) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;

    set({ isLoading: true, error: null });

    // Optimistically update local state so the UI doesn't get stuck if DB fails!
    const currentProfile = get().profile;
    if (currentProfile) {
      set({ profile: { ...currentProfile, ...patch } as Profile });
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({
      profile: data ? rowToProfile(data as Record<string, unknown>) : get().profile,
      isLoading: false,
      error: null,
    });
  },

  setPersona: async (persona: Persona) => {
    validatePersona(persona);
    await get().updateProfile({ persona });
  },

  setGoals: async (goals: Goal[]) => {
    await get().updateProfile({ goals });
  },

  setDietaryTags: async (tags: DietaryTag[]) => {
    for (const tag of tags) {
      validateDietaryTag(tag);
    }
    await get().updateProfile({ dietary_tags: tags });
  },

  markOnboarded: async () => {
    await get().updateProfile({ onboarded: true });
  },
}));
