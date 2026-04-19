import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchRankedFeed } from '@/lib/feed-ranker';
import { useAuthStore } from '@/stores/auth.store';
import { usePantryStore } from '@/stores/pantry.store';
import { useProfileStore } from '@/stores/profile.store';
import { useScheduleStore } from '@/stores/schedule.store';
import { safeDeserialize } from '@/lib/validator';
import type { RankedPost, UserSignalVector } from '@/types/domain';

const FEED_CACHE_KEY = '@foodos/feed_cache';

interface FeedState {
  posts: RankedPost[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
}

interface FeedActions {
  fetchFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  cacheCurrentPage: () => Promise<void>;
  loadCachedFeed: () => Promise<void>;
}

type FeedStore = FeedState & FeedActions;

function buildSignals(): UserSignalVector {
  const userId = useAuthStore.getState().userId ?? '';
  const profile = useProfileStore.getState().profile;
  const pantryItems = usePantryStore.getState().items;
  const mealWindows = useScheduleStore.getState().mealWindows;
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const activeMealWindow = mealWindows.find((w) => {
    if (w.dayOfWeek !== currentDay) return false;
    const [sh, sm] = w.startTime.split(':').map(Number);
    const [eh, em] = w.endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    return currentMinutes >= start && currentMinutes < end;
  }) ?? mealWindows[0] ?? {
    id: '', schedulePatternId: '', dayOfWeek: 0,
    windowName: 'lunch', startTime: '12:00', endTime: '13:00', isManualOverride: false,
  };

  return {
    userId,
    goals: profile?.goals ?? [],
    dietaryTags: profile?.dietaryTags ?? [],
    pantryItems,
    recentEvents: [],
    mealWindow: activeMealWindow,
  };
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  posts: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  error: null,

  fetchFeed: async () => {
    set({ isLoading: true, error: null, cursor: null, hasMore: true });
    try {
      const signals = buildSignals();
      const { posts, nextCursor } = await fetchRankedFeed(signals, null, 20);
      set({ posts, cursor: nextCursor, hasMore: nextCursor !== null, isLoading: false });
      await get().cacheCurrentPage();
    } catch (e: unknown) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load feed' });
    }
  },

  loadMore: async () => {
    const { cursor, hasMore, isLoading, posts } = get();
    if (!hasMore || isLoading || !cursor) return;
    set({ isLoading: true, error: null });
    try {
      const signals = buildSignals();
      const { posts: newPosts, nextCursor } = await fetchRankedFeed(signals, cursor, 20);
      set({
        posts: [...posts, ...newPosts],
        cursor: nextCursor,
        hasMore: nextCursor !== null,
        isLoading: false,
      });
    } catch (e: unknown) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load more' });
    }
  },

  cacheCurrentPage: async () => {
    const { posts } = get();
    if (posts.length === 0) return;
    await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(posts.slice(0, 20)));
  },

  loadCachedFeed: async () => {
    const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return;
    const cached: RankedPost[] = safeDeserialize(raw, []);
    set((s) => ({ posts: s.posts.length === 0 ? cached : s.posts }));
  },
}));
