/**
 * RecommendationEngine Edge Function
 * Full server-side ranking with DB access: dietary filter → score → rank → return top N candidates.
 * Also generates PrepSuggestion records based on upcoming schedule + pantry.
 * Requirements: 5.1, 8.1, 8.2, 8.6
 *
 * Request body: { userId: string, mealWindowId: string }
 * Response: { candidates: DecisionCandidate[], prepSuggestionsGenerated: number }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ───────────────────────────────────────────────────────

type Goal = "build_muscle" | "lose_fat" | "maintain" | "improve_energy" | "eat_cleaner";
type DietaryTag = "vegetarian" | "vegan" | "gluten_free" | "dairy_free" | "halal" | "kosher" | "nut_free";
type PantryClassification = "cook_now" | "1_ingredient_away" | "needs_shopping";

interface PantryItem { id: string; userId: string; name: string; }
interface RecipeIngredient { name: string; quantity: number | null; unit: string | null; tags: DietaryTag[]; }
interface Macros { calories: number; protein: number; carbs: number; fat: number; }
interface Recipe { id: string; title: string; description: string | null; ingredients: RecipeIngredient[]; steps: Array<{ order: number; instruction: string }>; macros: Macros; tags: string[]; cookTime: number; mediaUrl: string | null; mediaType: "image" | "video" | null; authorId: string | null; createdAt: string; }
interface BehaviorEvent { id: string; userId: string; eventType: string; entityId: string | null; sessionId: string; timestamp: string; metadata: Record<string, unknown>; }
interface MealWindow { id: string; schedulePatternId: string; dayOfWeek: number; windowName: string; startTime: string; endTime: string; isManualOverride: boolean; }
interface DecisionCandidate { recipe: Recipe; pantryMatchPct: number; goalAlignmentScore: number; behaviorRecencyScore: number; totalScore: number; missingIngredients: string[]; classification: PantryClassification; }

// ── Pantry Utils ────────────────────────────────────────────────

function getMissingIngredients(ingredients: RecipeIngredient[], pantry: PantryItem[]): string[] {
  const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase().trim()));
  return ingredients.filter((ing) => !pantryNames.has(ing.name.toLowerCase().trim())).map((ing) => ing.name);
}

function computePantryMatch(ingredients: RecipeIngredient[], pantry: PantryItem[]): number {
  if (ingredients.length === 0) return 1;
  const missing = getMissingIngredients(ingredients, pantry);
  return (ingredients.length - missing.length) / ingredients.length;
}

function classifyPantryMatch(missingCount: number): PantryClassification {
  if (missingCount === 0) return "cook_now";
  if (missingCount === 1) return "1_ingredient_away";
  return "needs_shopping";
}

// ── Scoring ─────────────────────────────────────────────────────

function computeGoalAlignment(macros: Macros, goals: Goal[]): number {
  if (goals.length === 0) return 0.5;
  const scores = goals.map((goal) => {
    switch (goal) {
      case "build_muscle": return macros.protein > 30 ? 1 : macros.protein / 30;
      case "lose_fat": return macros.calories < 500 ? 1 : Math.max(0, 1 - (macros.calories - 500) / 500);
      case "maintain": return 0.5;
      case "improve_energy": return macros.carbs > 50 ? 1 : macros.carbs / 50;
      case "eat_cleaner": return macros.fat < 15 ? 1 : Math.max(0, 1 - (macros.fat - 15) / 15);
      default: return 0.5;
    }
  });
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

const DECAY_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

function computeRecencyScore(recipeId: string, recentEvents: BehaviorEvent[]): number {
  const relevant = recentEvents.filter(
    (e) => (e.eventType === "cook_now" || e.eventType === "meal_completed") && e.entityId === recipeId,
  );
  if (relevant.length === 0) return 0;
  const now = Date.now();
  const decaySum = relevant.reduce((sum, e) => {
    const ageMs = now - new Date(e.timestamp).getTime();
    return sum + Math.exp((-Math.LN2 * ageMs) / DECAY_HALF_LIFE_MS);
  }, 0);
  return Math.min(1, decaySum);
}

function scoreCandidate(recipe: Recipe, pantryItems: PantryItem[], goals: Goal[], recentEvents: BehaviorEvent[]): DecisionCandidate {
  const pantryMatchPct = computePantryMatch(recipe.ingredients, pantryItems);
  const goalAlignmentScore = computeGoalAlignment(recipe.macros, goals);
  const behaviorRecencyScore = computeRecencyScore(recipe.id, recentEvents);
  const totalScore = pantryMatchPct * 1000 + goalAlignmentScore * 100 + behaviorRecencyScore;
  const missingIngredients = getMissingIngredients(recipe.ingredients, pantryItems);
  const classification = classifyPantryMatch(missingIngredients.length);
  return { recipe, pantryMatchPct, goalAlignmentScore, behaviorRecencyScore, totalScore, missingIngredients, classification };
}

function applyDietaryFilter(recipes: Recipe[], restrictions: DietaryTag[]): Recipe[] {
  if (restrictions.length === 0) return recipes;
  return recipes.filter((r) =>
    r.ingredients.every((ing) => !ing.tags.some((t) => restrictions.includes(t))),
  );
}

function rankCandidates(candidates: DecisionCandidate[]): DecisionCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.pantryMatchPct !== a.pantryMatchPct) return b.pantryMatchPct - a.pantryMatchPct;
    if (b.goalAlignmentScore !== a.goalAlignmentScore) return b.goalAlignmentScore - a.goalAlignmentScore;
    return b.behaviorRecencyScore - a.behaviorRecencyScore;
  });
}

// ── MealWindow helpers ──────────────────────────────────────────

/** Converts a MealWindow's startTime "HH:mm" on a given date to a Date object. */
function windowToDatetime(window: MealWindow, date: Date): Date {
  const [hours, minutes] = window.startTime.split(":").map(Number);
  const dt = new Date(date);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
}

/** Returns upcoming MealWindows within the next 24 hours based on schedule patterns. */
function getUpcomingWindows(mealWindows: MealWindow[], now: Date): Array<{ window: MealWindow; targetDatetime: Date }> {
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const results: Array<{ window: MealWindow; targetDatetime: Date }> = [];

  for (const w of mealWindows) {
    // Check today and tomorrow
    for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + dayOffset);
      if (candidate.getDay() === w.dayOfWeek) {
        const dt = windowToDatetime(w, candidate);
        if (dt > now && dt <= cutoff) {
          results.push({ window: w, targetDatetime: dt });
        }
      }
    }
  }

  return results;
}

// ── Main Handler ────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" },
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const { userId, mealWindowId } = await req.json();
    if (!userId || !mealWindowId) {
      return new Response(JSON.stringify({ error: "userId and mealWindowId are required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const db = createClient(supabaseUrl, supabaseKey);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all required data in parallel
    const [profileResult, pantryResult, eventsResult, recipesResult, scheduleResult] = await Promise.all([
      db.from("profiles").select("goals, dietary_tags").eq("id", userId).maybeSingle(),
      db.from("pantry_items").select("id, user_id, name").eq("user_id", userId),
      db.from("behavior_events")
        .select("id, user_id, event_type, entity_id, session_id, timestamp, metadata")
        .eq("user_id", userId)
        .gte("timestamp", thirtyDaysAgo),
      db.from("recipes").select("id, title, description, ingredients, steps, macros, tags, cook_time, media_url, media_type, author_id, created_at"),
      db.from("schedule_patterns")
        .select("id, user_id, context, meal_windows, is_drifted, is_manual, updated_at")
        .eq("user_id", userId),
    ]);

    const goals = (profileResult.data?.goals ?? []) as Goal[];
    const dietaryTags = (profileResult.data?.dietary_tags ?? []) as DietaryTag[];
    const pantryItems = (pantryResult.data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
    })) as PantryItem[];

    const recentEvents = (eventsResult.data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      eventType: row.event_type as string,
      entityId: row.entity_id as string | null,
      sessionId: row.session_id as string,
      timestamp: row.timestamp as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    })) as BehaviorEvent[];

    const recipes = (recipesResult.data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      ingredients: (row.ingredients as RecipeIngredient[]) ?? [],
      steps: (row.steps as Array<{ order: number; instruction: string }>) ?? [],
      macros: (row.macros as Macros) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: (row.tags as string[]) ?? [],
      cookTime: row.cook_time as number,
      mediaUrl: row.media_url as string | null,
      mediaType: row.media_type as "image" | "video" | null,
      authorId: row.author_id as string | null,
      createdAt: row.created_at as string,
    })) as Recipe[];

    // ── Ranking ─────────────────────────────────────────────────
    const filtered = applyDietaryFilter(recipes, dietaryTags);
    const pool = filtered.length > 0 ? filtered : recipes;
    const scored = pool.map((recipe) => scoreCandidate(recipe, pantryItems, goals, recentEvents));
    const ranked = rankCandidates(scored);
    const candidates = ranked.slice(0, 5);

    // ── PrepSuggestion generation ────────────────────────────────
    let prepSuggestionsGenerated = 0;

    if (scheduleResult.data && scheduleResult.data.length > 0) {
      // Collect all meal windows from all schedule patterns
      const allMealWindows: MealWindow[] = scheduleResult.data.flatMap((pattern: Record<string, unknown>) => {
        const windows = (pattern.meal_windows as Array<Record<string, unknown>>) ?? [];
        return windows.map((w) => ({
          id: w.id as string,
          schedulePatternId: pattern.id as string,
          dayOfWeek: w.day_of_week as number,
          windowName: w.window_name as string,
          startTime: w.start_time as string,
          endTime: w.end_time as string,
          isManualOverride: (w.is_manual_override as boolean) ?? false,
        }));
      });

      const now = new Date();
      const upcomingWindows = getUpcomingWindows(allMealWindows, now);
      const topRecipe = candidates[0]?.recipe;

      if (topRecipe && upcomingWindows.length > 0) {
        for (const { targetDatetime } of upcomingWindows) {
          const targetIso = targetDatetime.toISOString();

          // Check if a prep suggestion already exists for this user+recipe+targetDatetime
          const { data: existing } = await db
            .from("prep_suggestions")
            .select("id")
            .eq("user_id", userId)
            .eq("recipe_id", topRecipe.id)
            .eq("target_datetime", targetIso)
            .maybeSingle();

          if (!existing) {
            const { error } = await db.from("prep_suggestions").insert({
              user_id: userId,
              recipe_id: topRecipe.id,
              target_datetime: targetIso,
            });
            if (!error) prepSuggestionsGenerated++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ candidates, prepSuggestionsGenerated }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
