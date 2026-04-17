/**
 * Property-based tests for lib/feed-ranker.ts
 *
 * Property 17: FeedRanker score formula invariant
 * Property 18: FeedRanker determinism
 * Property 19: FeedRanker engagement monotonicity
 *
 * Validates: Requirements 10.2, 10.3, 10.4
 */

import * as fc from 'fast-check';
import { scorePost, computeRecency, computeEngagement, rankFeed } from '../feed-ranker';
import type { Post, RankedPost, UserSignalVector, PantryItem, BehaviorEvent, MealWindow, Goal, DietaryTag } from '@/types/domain';

// ── Helpers ──────────────────────────────────────────────────────

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    authorId: 'user-1',
    postType: 'image',
    caption: null,
    mediaUrl: null,
    recipeId: null,
    likeCount: 0,
    viewCount: 0,
    shareCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeRankedPost(post: Post): RankedPost {
  return { post, recipe: null, score: 0, recencyScore: 0, engagementScore: 0, pantryMatchScore: 0, goalAlignmentScore: 0 };
}

const GOALS: Goal[] = ['build_muscle', 'lose_fat', 'maintain', 'improve_energy', 'eat_cleaner'];
const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_free'];

function makeSignals(): UserSignalVector {
  return {
    userId: 'user-1',
    goals: [],
    dietaryTags: [],
    pantryItems: [],
    recentEvents: [],
    mealWindow: {
      id: 'mw-1',
      schedulePatternId: 'sp-1',
      dayOfWeek: 1,
      windowName: 'lunch',
      startTime: '12:00',
      endTime: '13:00',
      isManualOverride: false,
    },
  };
}

const postArb = (): fc.Arbitrary<Post> =>
  fc.record({
    id: fc.uuid(),
    authorId: fc.uuid(),
    postType: fc.constantFrom<Post['postType']>('image', 'short_video', 'recipe_card'),
    caption: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    mediaUrl: fc.constant(null),
    recipeId: fc.constant(null),
    likeCount: fc.integer({ min: 0, max: 10000 }),
    viewCount: fc.integer({ min: 0, max: 100000 }),
    shareCount: fc.integer({ min: 0, max: 5000 }),
    createdAt: fc.integer({ min: Date.now() - 7 * 86400000, max: Date.now() })
      .map((ts) => new Date(ts).toISOString()),
  });

// ── Property 17: FeedRanker score formula invariant ──────────────
// Validates: Requirements 10.2
describe('Property 17: FeedRanker score formula invariant', () => {
  it('computed score equals 0.3×recency + 0.3×engagement + 0.2×pantryMatch + 0.2×goalAlignment', () => {
    fc.assert(
      fc.property(postArb(), (post) => {
        const now = new Date();
        const signals = makeSignals();
        const recency = computeRecency(post.createdAt, now);
        const engagement = computeEngagement(post);
        const pantryMatch = 0.5; // no recipe → neutral
        const goalAlignment = 0.5; // no recipe → neutral

        const expected = 0.3 * recency + 0.3 * engagement + 0.2 * pantryMatch + 0.2 * goalAlignment;
        const actual = scorePost(post, signals, now, null);

        expect(Math.abs(actual - expected)).toBeLessThan(1e-10);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 18: FeedRanker determinism ─────────────────────────
// Validates: Requirements 10.3
describe('Property 18: FeedRanker determinism', () => {
  it('same posts + signals produce identical ordering on repeated calls', () => {
    fc.assert(
      fc.property(
        fc.array(postArb(), { minLength: 1, maxLength: 20 }),
        (posts) => {
          const signals = makeSignals();
          const rankedPosts = posts.map(makeRankedPost);

          // Use a fixed "now" to ensure determinism
          const fixedNow = new Date('2025-01-01T12:00:00Z');
          const scored1 = rankedPosts.map((rp) => ({
            ...rp,
            score: scorePost(rp.post, signals, fixedNow, null),
          })).sort((a, b) => b.score - a.score);

          const scored2 = rankedPosts.map((rp) => ({
            ...rp,
            score: scorePost(rp.post, signals, fixedNow, null),
          })).sort((a, b) => b.score - a.score);

          expect(scored1.map((p) => p.post.id)).toEqual(scored2.map((p) => p.post.id));
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 19: FeedRanker engagement monotonicity ──────────────
// Validates: Requirements 10.4
describe('Property 19: FeedRanker engagement monotonicity', () => {
  it('post A with higher engagement than identical post B is ranked no lower than B', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),
        fc.integer({ min: 0, max: 5000 }),
        (engagementA, engagementB) => {
          const now = new Date('2025-01-01T12:00:00Z');
          const signals = makeSignals();

          // Same post, same createdAt — only engagement differs
          const basePost = makePost({ createdAt: now.toISOString() });
          const postA = { ...basePost, id: 'a', likeCount: engagementA, viewCount: 0, shareCount: 0 };
          const postB = { ...basePost, id: 'b', likeCount: engagementB, viewCount: 0, shareCount: 0 };

          const scoreA = scorePost(postA, signals, now, null);
          const scoreB = scorePost(postB, signals, now, null);

          if (engagementA >= engagementB) {
            expect(scoreA).toBeGreaterThanOrEqual(scoreB);
          } else {
            expect(scoreA).toBeLessThanOrEqual(scoreB);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
