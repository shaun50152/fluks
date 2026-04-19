import type {
  Recipe,
  DietaryTag,
  Macros,
  Goal,
  MealWindow,
  BehaviorEvent,
  DecisionCandidate,
  UserSignalVector,
} from '@/types/domain';
import {
  computePantryMatch,
  getMissingIngredients,
  classifyPantryMatch,
} from '@/lib/pantry-utils';

// ── Dietary Filtering ───────────────────────────────────────────

/**
 * Removes recipes where any ingredient tag matches a user dietary restriction.
 */
export function applyDietaryFilter(recipes: Recipe[], restrictions: DietaryTag[]): Recipe[] {
  if (restrictions.length === 0) return recipes;
  return recipes.filter((r) =>
    r.ingredients.every((ing) => !ing.tags.some((t) => restrictions.includes(t))),
  );
}

// ── Goal Alignment ──────────────────────────────────────────────

/**
 * Returns a 0–1 score representing how well the given macros align with the user's goals.
 * Returns 0.5 if no goals are provided.
 */
export function computeGoalAlignment(
  macros: Macros,
  goals: Goal[],
  _mealWindow: MealWindow | null,
): number {
  if (goals.length === 0) return 0.5;

  const scores = goals.map((goal) => {
    switch (goal) {
      case 'build_muscle':
        // High protein (>30g) → higher score
        return macros.protein > 30 ? 1 : macros.protein / 30;
      case 'lose_fat':
        // Low calories (<500) → higher score
        return macros.calories < 500 ? 1 : Math.max(0, 1 - (macros.calories - 500) / 500);
      case 'maintain':
        // Balanced macros → moderate score (reward moderate values)
        return 0.5;
      case 'improve_energy':
        // High carbs → higher score (>50g is good)
        return macros.carbs > 50 ? 1 : macros.carbs / 50;
      case 'eat_cleaner':
        // Low fat (<15g) → higher score
        return macros.fat < 15 ? 1 : Math.max(0, 1 - (macros.fat - 15) / 15);
      default:
        return 0.5;
    }
  });

  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// ── Recency Score ───────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DECAY_HALF_LIFE_MS = SEVEN_DAYS_MS; // half-life of 7 days

/**
 * Computes an exponential decay recency score for a recipe based on
 * cook_now and meal_completed events. Events within the last 7 days
 * score higher; older events decay. Returns 0 if no relevant events.
 */
export function computeRecencyScore(recipeId: string, recentEvents: BehaviorEvent[]): number {
  const relevant = recentEvents.filter(
    (e) =>
      (e.eventType === 'cook_now' || e.eventType === 'meal_completed') &&
      e.entityId === recipeId,
  );

  if (relevant.length === 0) return 0;

  const now = Date.now();
  const decaySum = relevant.reduce((sum, e) => {
    const ageMs = now - new Date(e.timestamp).getTime();
    // Exponential decay: score = e^(-ln(2) * age / halfLife)
    const score = Math.exp((-Math.LN2 * ageMs) / DECAY_HALF_LIFE_MS);
    return sum + score;
  }, 0);

  // Normalize: cap at 1 (multiple events can accumulate but max is 1)
  return Math.min(1, decaySum);
}

// ── Candidate Scoring ───────────────────────────────────────────

/**
 * Scores a single recipe against the user signal vector.
 * totalScore = pantryMatchPct * 1000 + goalAlignmentScore * 100 + behaviorRecencyScore
 */
export function scoreCandidate(recipe: Recipe, signals: UserSignalVector): DecisionCandidate {
  const pantryMatchPct = computePantryMatch(recipe.ingredients, signals.pantryItems);
  const goalAlignmentScore = computeGoalAlignment(recipe.macros, signals.goals, signals.mealWindow);
  const behaviorRecencyScore = computeRecencyScore(recipe.id, signals.recentEvents);
  const totalScore = pantryMatchPct * 1000 + goalAlignmentScore * 100 + behaviorRecencyScore;
  const missingIngredients = getMissingIngredients(recipe.ingredients, signals.pantryItems);
  const classification = classifyPantryMatch(missingIngredients.length);

  return {
    recipe,
    pantryMatchPct,
    goalAlignmentScore,
    behaviorRecencyScore,
    totalScore,
    missingIngredients,
    classification,
  };
}

// ── Ranking ─────────────────────────────────────────────────────

/**
 * Sorts candidates by: pantryMatchPct DESC → goalAlignmentScore DESC → behaviorRecencyScore DESC
 */
export function rankCandidates(candidates: DecisionCandidate[]): DecisionCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.pantryMatchPct !== a.pantryMatchPct) return b.pantryMatchPct - a.pantryMatchPct;
    if (b.goalAlignmentScore !== a.goalAlignmentScore)
      return b.goalAlignmentScore - a.goalAlignmentScore;
    return b.behaviorRecencyScore - a.behaviorRecencyScore;
  });
}

// ── Decision Candidates ─────────────────────────────────────────

/**
 * Applies dietary filter, scores all recipes, ranks them, and returns at least 1 candidate.
 * If all recipes are filtered out by dietary restrictions, falls back to the unfiltered set.
 */
export function getDecisionCandidates(
  signals: UserSignalVector,
  recipes: Recipe[],
): DecisionCandidate[] {
  const filtered = applyDietaryFilter(recipes, signals.dietaryTags);
  const pool = filtered.length > 0 ? filtered : recipes;
  const scored = pool.map((recipe) => scoreCandidate(recipe, signals));
  return rankCandidates(scored);
}
