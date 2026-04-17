import { supabase } from '@/lib/supabase';
import { computePantryMatch } from '@/lib/pantry-utils';
import { computeGoalAlignment } from '@/lib/recommendation-engine';
import type { Post, RankedPost, UserSignalVector } from '@/types/domain';

const HALF_LIFE_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Exponential decay recency score. Half-life = 48h.
 * Returns value in [0, 1].
 */
export function computeRecency(createdAt: string, now: Date): number {
  const ageMs = now.getTime() - new Date(createdAt).getTime();
  return Math.exp((-Math.LN2 * ageMs) / HALF_LIFE_MS);
}

/**
 * Log-normalized engagement score from likes + views + shares.
 * Returns value in [0, 1].
 */
export function computeEngagement(post: Post): number {
  const total = post.likeCount + post.viewCount + post.shareCount;
  if (total === 0) return 0;
  // log1p normalizes: log(1+x) / log(1+10000) caps at ~1 for very popular posts
  return Math.min(1, Math.log1p(total) / Math.log1p(10000));
}

/**
 * Scores a single post using the weighted formula:
 * score = 0.3×recency + 0.3×engagement + 0.2×pantryMatch + 0.2×goalAlignment
 * Requirements: 10.2, 10.3, 10.4
 */
export function scorePost(
  post: Post,
  signals: UserSignalVector,
  now: Date,
  recipe?: { ingredients: { name: string; quantity: number | null; unit: string | null; tags: import('@/types/domain').DietaryTag[] }[]; macros: import('@/types/domain').Macros } | null
): number {
  const recencyScore = computeRecency(post.createdAt, now);
  const engagementScore = computeEngagement(post);
  const pantryMatchScore = recipe
    ? computePantryMatch(recipe.ingredients, signals.pantryItems)
    : 0.5;
  const goalAlignmentScore = recipe
    ? computeGoalAlignment(recipe.macros, signals.goals, signals.mealWindow)
    : 0.5;

  return (
    0.3 * recencyScore +
    0.3 * engagementScore +
    0.2 * pantryMatchScore +
    0.2 * goalAlignmentScore
  );
}

/**
 * Pure deterministic client-side feed ranker.
 * Given the same posts + signals, always produces identical ordering.
 * Requirements: 10.3
 */
export function rankFeed(
  posts: RankedPost[],
  signals: UserSignalVector
): RankedPost[] {
  const now = new Date();
  const scored = posts.map((rp) => {
    const score = scorePost(rp.post, signals, now, rp.recipe);
    const recencyScore = computeRecency(rp.post.createdAt, now);
    const engagementScore = computeEngagement(rp.post);
    const pantryMatchScore = rp.recipe
      ? computePantryMatch(rp.recipe.ingredients, signals.pantryItems)
      : 0.5;
    const goalAlignmentScore = rp.recipe
      ? computeGoalAlignment(rp.recipe.macros, signals.goals, signals.mealWindow)
      : 0.5;
    return { ...rp, score, recencyScore, engagementScore, pantryMatchScore, goalAlignmentScore };
  });
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Calls the authoritative server-side FeedRanker edge function.
 * Falls back to client-side ranking if the edge function fails.
 * Requirements: 10.2
 */
export async function fetchRankedFeed(
  signals: UserSignalVector,
  cursor: string | null,
  limit = 20
): Promise<{ posts: RankedPost[]; nextCursor: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('feed-ranker', {
      body: { signals, cursor, limit },
    });
    if (error) throw new Error(error.message);
    return data as { posts: RankedPost[]; nextCursor: string | null };
  } catch {
    // Fallback: fetch raw posts and rank client-side
    const query = supabase
      .from('posts')
      .select('*, recipes(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query.lt('created_at', cursor);
    }

    const { data: rows, error: fetchError } = await query;
    if (fetchError) throw new Error(fetchError.message);

    const rankedPosts: RankedPost[] = (rows ?? []).map((row: Record<string, unknown>) => ({
      post: {
        id: row.id as string,
        authorId: row.author_id as string,
        postType: row.post_type as import('@/types/domain').PostType,
        caption: row.caption as string | null,
        mediaUrl: row.media_url as string | null,
        recipeId: row.recipe_id as string | null,
        likeCount: row.like_count as number,
        viewCount: row.view_count as number,
        shareCount: row.share_count as number,
        createdAt: row.created_at as string,
      },
      recipe: row.recipes as import('@/types/domain').Recipe | null,
      score: 0,
      recencyScore: 0,
      engagementScore: 0,
      pantryMatchScore: 0,
      goalAlignmentScore: 0,
    }));

    const sorted = rankFeed(rankedPosts, signals);
    const lastPost = sorted[sorted.length - 1];
    const nextCursor = lastPost ? lastPost.post.createdAt : null;
    return { posts: sorted, nextCursor };
  }
}
