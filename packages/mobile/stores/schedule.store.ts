import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { deriveSchedulePattern, resolveOverlaps, detectDrift } from '@/lib/schedule-detector';
import type { SchedulePattern, MealWindow, ScheduleContext, BehaviorEvent } from '@/types/domain';

function rowToMealWindow(row: Record<string, unknown>): MealWindow {
  return {
    id: row.id as string,
    schedulePatternId: row.schedule_pattern_id as string,
    dayOfWeek: row.day_of_week as number,
    windowName: row.window_name as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    isManualOverride: row.is_manual_override as boolean,
  };
}

function rowToSchedulePattern(row: Record<string, unknown>, windows: MealWindow[]): SchedulePattern {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    context: row.context as ScheduleContext,
    mealWindows: windows.filter((w) => w.schedulePatternId === (row.id as string)),
    isDrifted: row.is_drifted as boolean,
    isManual: row.is_manual as boolean,
    updatedAt: row.updated_at as string,
  };
}

interface ScheduleState {
  patterns: SchedulePattern[];
  mealWindows: MealWindow[];
  isDrifted: boolean;
  isLoading: boolean;
  error: string | null;
}

interface ScheduleActions {
  fetchSchedule: () => Promise<void>;
  updateMealWindow: (id: string, patch: Partial<Pick<MealWindow, 'windowName' | 'startTime' | 'endTime'>>) => Promise<void>;
  setManualOverride: (id: string) => Promise<void>;
  runDetector: () => Promise<void>;
}

type ScheduleStore = ScheduleState & ScheduleActions;

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  patterns: [],
  mealWindows: [],
  isDrifted: false,
  isLoading: false,
  error: null,

  fetchSchedule: async () => {
    const userId = useAuthStore.getState().userId;
    if (!userId) return;
    set({ isLoading: true, error: null });

    const [patternsResult, windowsResult] = await Promise.all([
      supabase.from('schedule_patterns').select('*').eq('user_id', userId),
      supabase.from('meal_windows').select('*'),
    ]);

    if (patternsResult.error) {
      set({ isLoading: false, error: patternsResult.error.message });
      return;
    }
    if (windowsResult.error) {
      set({ isLoading: false, error: windowsResult.error.message });
      return;
    }

    const mealWindows = (windowsResult.data ?? []).map((r) =>
      rowToMealWindow(r as Record<string, unknown>)
    );
    const patterns = (patternsResult.data ?? []).map((r) =>
      rowToSchedulePattern(r as Record<string, unknown>, mealWindows)
    );

    set({ patterns, mealWindows, isLoading: false, error: null });
  },

  updateMealWindow: async (id, patch) => {
    set({ isLoading: true, error: null });
    const dbPatch: Record<string, unknown> = {};
    if (patch.windowName !== undefined) dbPatch.window_name = patch.windowName;
    if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
    if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;

    const { error } = await supabase.from('meal_windows').update(dbPatch).eq('id', id);
    if (error) { set({ isLoading: false, error: error.message }); return; }

    set((s) => ({
      mealWindows: s.mealWindows.map((w) => w.id === id ? { ...w, ...patch } : w),
      patterns: s.patterns.map((p) => ({
        ...p,
        mealWindows: p.mealWindows.map((w) => w.id === id ? { ...w, ...patch } : w),
      })),
      isLoading: false,
      error: null,
    }));
  },

  setManualOverride: async (id) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase
      .from('meal_windows')
      .update({ is_manual_override: true })
      .eq('id', id);
    if (error) { set({ isLoading: false, error: error.message }); return; }

    set((s) => ({
      mealWindows: s.mealWindows.map((w) => w.id === id ? { ...w, isManualOverride: true } : w),
      patterns: s.patterns.map((p) => ({
        ...p,
        mealWindows: p.mealWindows.map((w) => w.id === id ? { ...w, isManualOverride: true } : w),
      })),
      isLoading: false,
      error: null,
    }));
  },

  runDetector: async () => {
    const { patterns, mealWindows } = get();
    if (patterns.length === 0) return;

    const userId = useAuthStore.getState().userId;
    if (!userId) return;

    // Fetch last 14 days of BehaviorEvents
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: eventsData, error: eventsError } = await supabase
      .from('behavior_events')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', cutoff);

    if (eventsError || !eventsData) return;

    const events = eventsData as BehaviorEvent[];

    // Derive new windows and resolve overlaps (skip manual overrides)
    const derived = deriveSchedulePattern(events, mealWindows);
    const resolved = resolveOverlaps(derived);

    // Upsert derived windows (non-manual) to Supabase
    if (resolved.length > 0) {
      const pattern = patterns[0];
      const upsertRows = resolved.map((w) => ({
        id: w.id,
        schedule_pattern_id: pattern.id,
        day_of_week: w.dayOfWeek,
        window_name: w.windowName,
        start_time: w.startTime,
        end_time: w.endTime,
        is_manual_override: false,
      }));
      await supabase.from('meal_windows').upsert(upsertRows, { onConflict: 'id' });
    }

    // Detect drift against the first pattern
    const pattern = patterns[0];
    const drifted = detectDrift(events, pattern);

    if (drifted) {
      await supabase
        .from('schedule_patterns')
        .update({ is_drifted: true })
        .eq('id', pattern.id);

      set((s) => ({
        isDrifted: true,
        patterns: s.patterns.map((p) =>
          p.id === pattern.id ? { ...p, isDrifted: true } : p
        ),
      }));
    }
  },
}));
