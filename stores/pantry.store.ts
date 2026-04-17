import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { validatePantryItemName, validatePantryItemQuantity, safeDeserialize } from '@/lib/validator';
import { getPersonaStaples } from '@/lib/pantry-utils';
import type { PantryItem, Persona } from '@/types/domain';

function rowToPantryItem(row: Record<string, unknown>): PantryItem {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    quantity: row.quantity as number | null,
    unit: row.unit as string | null,
    expiryDate: row.expiry_date as string | null,
    isStaple: row.is_staple as boolean,
    isManual: row.is_manual as boolean,
    createdAt: row.created_at as string,
  };
}

interface PantryState {
  items: PantryItem[];
  isLoading: boolean;
  error: string | null;
}

interface PantryActions {
  fetchPantry: () => Promise<void>;
  addItem: (item: Omit<PantryItem, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  markStaple: (id: string, isStaple: boolean) => Promise<void>;
  seedFromPersona: (persona: Persona) => Promise<void>;
}

type PantryStore = PantryState & PantryActions;

export const usePantryStore = create<PantryStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchPantry: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.from('pantry_items').select('*').eq('user_id', userId);
    if (error) { set({ isLoading: false, error: error.message }); return; }
    const safeData = safeDeserialize<Record<string, unknown>[]>(data, []);
    set({ items: safeData.map((r) => rowToPantryItem(r)), isLoading: false, error: null });
  },

  addItem: async (item) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    validatePantryItemName(item.name);
    if (item.quantity !== null) validatePantryItemQuantity(item.quantity);
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('pantry_items')
      .insert({ user_id: userId, name: item.name, quantity: item.quantity, unit: item.unit, expiry_date: item.expiryDate, is_staple: item.isStaple, is_manual: item.isManual })
      .select().single();
    if (error) { set({ isLoading: false, error: error.message }); return; }
    set((s) => ({ items: [...s.items, rowToPantryItem(data as Record<string, unknown>)], isLoading: false, error: null }));
  },

  removeItem: async (id) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.from('pantry_items').delete().eq('id', id);
    if (error) { set({ isLoading: false, error: error.message }); return; }
    set((s) => ({ items: s.items.filter((i) => i.id !== id), isLoading: false, error: null }));
  },

  markStaple: async (id, isStaple) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.from('pantry_items').update({ is_staple: isStaple }).eq('id', id);
    if (error) { set({ isLoading: false, error: error.message }); return; }
    set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, isStaple } : i), isLoading: false, error: null }));
  },

  seedFromPersona: async (persona) => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    const stapleNames = getPersonaStaples(persona);
    const existingNames = new Set(get().items.map((i) => i.name.toLowerCase().trim()));
    const toInsert = stapleNames.filter((n) => !existingNames.has(n.toLowerCase().trim()));
    if (toInsert.length === 0) return;
    set({ isLoading: true, error: null });
    const rows = toInsert.map((name) => ({ user_id: userId, name, quantity: null, unit: null, expiry_date: null, is_staple: true, is_manual: false }));
    const { data, error } = await supabase.from('pantry_items').insert(rows).select();
    if (error) { set({ isLoading: false, error: error.message }); return; }
    const newItems = (data ?? []).map((r) => rowToPantryItem(r as Record<string, unknown>));
    set((s) => ({ items: [...s.items, ...newItems], isLoading: false, error: null }));
  },
}));
