import { classifyPantryMatch, getMissingIngredients } from '@/lib/pantry-utils';
import type { DietaryTag, Goal, PantryClassification, PantryItem, Recipe } from '@/types/domain';

// ── Filter shape ────────────────────────────────────────────────

export type CookTimeFilter = 'any' | '<15' | '<30' | '<60';
export type PantryFilter = 'any' | PantryClassification;

export interface SearchFilters {
  dietary: DietaryTag | null;
  goal: Goal | null;
  cookTime: CookTimeFilter;
  pantry: PantryFilter;
}

export const EMPTY_FILTERS: SearchFilters = {
  dietary: null,
  goal: null,
  cookTime: 'any',
  pantry: 'any',
};

// ── Helpers ─────────────────────────────────────────────────────

function cookTimeMax(filter: CookTimeFilter): number | null {
  if (filter === '<15') return 15;
  if (filter === '<30') return 30;
  if (filter === '<60') return 60;
  return null;
}

// ── Pure filter function ────────────────────────────────────────

/**
 * Applies search filters to a list of recipes.
 * Pure function — no side effects, no network calls.
 *
 * @param recipes   The candidate recipe list (e.g. already text-matched from DB)
 * @param filters   The active filter configuration
 * @param pantry    The user's pantry items (used for pantry classification filter)
 * @returns         A new array containing only the recipes that pass all filters
 */
export function applySearchFilters(
  recipes: Recipe[],
  filters: SearchFilters,
  pantry: PantryItem[] = [],
): Recipe[] {
  let result = recipes;

  // Cook time filter
  const maxTime = cookTimeMax(filters.cookTime);
  if (maxTime !== null) {
    result = result.filter((r) => r.cookTime <= maxTime);
  }

  // Dietary filter — recipe must carry the tag OR every ingredient must carry it
  if (filters.dietary) {
    const tag = filters.dietary;
    result = result.filter(
      (r) =>
        r.tags.includes(tag) ||
        r.ingredients.every((ing) => ing.tags.includes(tag)),
    );
  }

  // Goal alignment filter — recipe tags must include the goal string
  if (filters.goal) {
    const goal = filters.goal;
    result = result.filter((r) => r.tags.includes(goal));
  }

  // Pantry classification filter
  if (filters.pantry !== 'any') {
    const target = filters.pantry;
    result = result.filter((r) => {
      const missing = getMissingIngredients(r.ingredients, pantry);
      return classifyPantryMatch(missing.length) === target;
    });
  }

  return result;
}
