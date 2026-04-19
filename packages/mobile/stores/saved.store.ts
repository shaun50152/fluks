/**
 * Zustand saved store
 * Requirements: 6.6, 6.7, 6.8, 15.1, 15.2, 15.3, 15.4, 15.5
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import type { SavedItem } from '@/types/domain';

function rowToSavedItem(row: Record<string, unknown>): SavedItem {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    entityType: row.entity_type as 'recipe' | 'post',
    entityId: row.entity_id as string,
    createdAt: row.created_at as string,
  };
}

interface SavedState {
  savedRecipes: SavedItem[];
  savedPosts: SavedItem[];
  isLoading: boolean;
  error: string | null;
}

interface SavedActions {
  fetchSaved: () => Promise<void>;
  saveEntity: (entityType: 'recipe' | 'post', entityId: string) => Promise<void>;
  unsaveEntity: (entityType: 'recipe' | 'post', entityId: string) => Promise<void>;
  isSaved: (entityType: 'recipe' | 'post', entityId: string) => boolean;
}

type SavedStore = SavedState & SavedActions;

export const useSavedStore = create<SavedStore>((set, get) => ({
  savedRecipes: [],
  savedPosts: [],
  isLoading: false,
  error: null,

  fetchSaved: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    const items = (data ?? []).map((r) => rowToSavedItem(r as Record<string, unknown>));
    set({
      savedRecipes: items.filter((i) => i.entityType === 'recipe'),
      savedPosts: items.filter((i) => i.entityType === 'post'),
      isLoading: false,
      error: null,
    });
  },

  saveEntity: async (entityType, entityId) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('saved_items')
      .upsert(
        { user_id: userId, entity_type: entityType, entity_id: entityId },
        { onConflict: 'user_id,entity_type,entity_id' }
      )
      .select()
      .single();
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    const item = rowToSavedItem(data as Record<string, unknown>);
    set((s) => {
      if (entityType === 'recipe') {
        const exists = s.savedRecipes.some((r) => r.entityId === entityId);
        return {
          savedRecipes: exists ? s.savedRecipes : [...s.savedRecipes, item],
          isLoading: false,
          error: null,
        };
      } else {
        const exists = s.savedPosts.some((p) => p.entityId === entityId);
        return {
          savedPosts: exists ? s.savedPosts : [...s.savedPosts, item],
          isLoading: false,
          error: null,
        };
      }
    });
  },

  unsaveEntity: async (entityType, entityId) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ isLoading: true, error: null });
    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set((s) => {
      if (entityType === 'recipe') {
        return {
          savedRecipes: s.savedRecipes.filter((r) => r.entityId !== entityId),
          isLoading: false,
          error: null,
        };
      } else {
        return {
          savedPosts: s.savedPosts.filter((p) => p.entityId !== entityId),
          isLoading: false,
          error: null,
        };
      }
    });
  },

  isSaved: (entityType, entityId) => {
    const s = get();
    if (entityType === 'recipe') {
      return s.savedRecipes.some((r) => r.entityId === entityId);
    }
    return s.savedPosts.some((p) => p.entityId === entityId);
  },
}));
