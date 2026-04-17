/**
 * FeedRanker Edge Function
 * Called on each Feed page request to return a ranked, paginated list of posts.
 * Requirements: 10.2, 10.3, 18.6
 *
 * score = 0.3×recency + 0.3×engagement + 0.2×pantryMatch + 0.2×goalAlignment
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Goal = "build_muscle" | "lose_fat" | "maintain" | "improve_energy" | "eat_cleaner";
type DietaryTag = "vegetarian" | "vegan" | "gluten_free" | "dairy_free" | "halal" | "kosher" | "nut_free";
type PostType = "short_video" | "image" | "recipe_card";

interface PantryItem { id: string; name: string; }
interface RecipeIngredient { name: string; quantity: number | null; unit: string | null; tags: DietaryTag[]; }
interface Macros { calories: number; protein: number; carbs: number; fat: number; }
interface Recipe { id: string; title: string; description: string | null; ingredients: RecipeIngredient[]; macros: Macros; tags: string[]; cookTime: number; mediaUrl: string | null; mediaType: "image" | "video" | null; authorId: string | null; createdAt: string; }
interface Post { id: string; authorId: string; postType: PostType; caption: string | null; mediaUrl: string | null; recipeId: string | null; likeCount: number; viewCount: number; shareCount: number; createdAt: string; }
interface UserSignalVector { userId: string; goals: Goal[]; dietaryTags: DietaryTag[]; pantryItems: PantryItem[]; }
interface RankedPost { post: Post; recipe: Recipe | null; score: number; recencyScore: number; engagementScore: number; pantryMatchScore: number; goalAlignmentScore: number; }

const HALF_LIFE_MS = 48 * 60 * 60 * 1000;
const MAX_ENGAGEMENT = 10_000;

function computeRecency(createdAt: string, now: Date): number {
  return Math.exp((-Math.LN2 * (now.getTime() - new Date(createdAt).getTime())) / HALF_LIFE_MS);
}

function computeEngagement(post: Post): number {
  return Math.min(1, Math.log1p(post.likeCount + post.viewCount + post.shareCount) / Math.log1p(MAX_ENGAGEMENT));
}

function computePantryMatch(ingredients: RecipeIngredient[], pantryItems: PantryItem[]): number {
  if (ingredients.length === 0) return 1;
  const names = new Set(pantryItems.map((p) => p.name.toLowerCase().trim()));
  return ingredients.filter((i) => names.has(i.name.toLowerCase().trim())).length / ingredients.length;
}

function computeGoalAlignment(macros: Macros, goals: Goal[]): number {
  if (goals.length === 0) return 0.5;
  const scores = goals.map((g) => {
    switch (g) {
      case "build_muscle": return macros.protein > 30 ? 1 : macros.protein / 30;
      case "lose_fat": return macros.calories < 500 ? 1 : Math.max(0, 1 - (macros.calories - 500) / 500);
      case "improve_energy": return macros.carbs > 50 ? 1 : macros.carbs / 50;
      case "eat_cleaner": return macros.fat < 15 ? 1 : Math.max(0, 1 - (macros.fat - 15) / 15);
      default: return 0.5;
    }
  });
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

function rankFeed(posts: Array<{ post: Post; recipe: Recipe | null }>, signals: UserSignalVector): RankedPost[] {
  const now = new Date();
  return posts.map(({ post, recipe }) => {
    const recencyScore = computeRecency(post.createdAt, now);
    const engagementScore = computeEngagement(post);
    const pantryMatchScore = recipe ? computePantryMatch(recipe.ingredients, signals.pantryItems) : 0.5;
    const goalAlignmentScore = recipe ? computeGoalAlignment(recipe.macros, signals.goals) : 0.5;
    const score = 0.3 * recencyScore + 0.3 * engagementScore + 0.2 * pantryMatchScore + 0.2 * goalAlignmentScore;
    return { post, recipe, score, recencyScore, engagementScore, pantryMatchScore, goalAlignmentScore };
  }).sort((a, b) => b.score - a.score);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: { "Content-Type": "application/json" } });

    const { userId, cursor = null, limit = 20 } = await req.json();
    if (!userId) return new Response(JSON.stringify({ error: "userId is required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const db = createClient(supabaseUrl, supabaseKey);
    const safeLimit = Math.min(limit, 20);

    const [profileResult, pantryResult, postsResult] = await Promise.all([
      db.from("profiles").select("goals, dietary_tags").eq("id", userId).maybeSingle(),
      db.from("pantry_items").select("id, name").eq("user_id", userId),
      (() => {
        let q = db.from("posts").select(`id, author_id, post_type, caption, media_url, recipe_id, like_count, view_count, share_count, created_at, recipes(id, title, description, ingredients, macros, tags, cook_time, media_url, media_type, author_id, created_at)`).is("deleted_at", null).order("created_at", { ascending: false }).limit(safeLimit);
        if (cursor) q = q.lt("created_at", cursor);
        return q;
      })(),
    ]);

    const signals: UserSignalVector = {
      userId,
      goals: (profileResult.data?.goals ?? []) as Goal[],
      dietaryTags: (profileResult.data?.dietary_tags ?? []) as DietaryTag[],
      pantryItems: (pantryResult.data ?? []) as PantryItem[],
    };

    const rawPosts = (postsResult.data ?? []).map((row: Record<string, unknown>) => {
      const r = row.recipes as Record<string, unknown> | null;
      return {
        post: { id: row.id as string, authorId: row.author_id as string, postType: row.post_type as PostType, caption: row.caption as string | null, mediaUrl: row.media_url as string | null, recipeId: row.recipe_id as string | null, likeCount: (row.like_count as number) ?? 0, viewCount: (row.view_count as number) ?? 0, shareCount: (row.share_count as number) ?? 0, createdAt: row.created_at as string },
        recipe: r ? { id: r.id as string, title: r.title as string, description: r.description as string | null, ingredients: (r.ingredients as RecipeIngredient[]) ?? [], macros: (r.macros as Macros) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }, tags: (r.tags as string[]) ?? [], cookTime: r.cook_time as number, mediaUrl: r.media_url as string | null, mediaType: r.media_type as "image" | "video" | null, authorId: r.author_id as string | null, createdAt: r.created_at as string } : null,
      };
    });

    const ranked = rankFeed(rawPosts, signals);
    const nextCursor = ranked.length > 0 ? ranked[ranked.length - 1].post.createdAt : null;

    return new Response(JSON.stringify({ posts: ranked, nextCursor }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
