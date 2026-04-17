import type { Persona, PantryItem, RecipeIngredient, PantryClassification } from '@/types/domain';

// ── Persona Staples ─────────────────────────────────────────────

export const PERSONA_STAPLES: Record<Persona, string[]> = {
  student: ['rice', 'eggs', 'bread', 'pasta', 'canned beans'],
  employee: ['coffee', 'eggs', 'bread', 'cheese', 'yogurt'],
  fitness: ['oats', 'eggs', 'chicken breast', 'rice', 'broccoli', 'protein powder'],
  irregular: ['rice', 'eggs', 'bread', 'canned tuna', 'instant noodles'],
};

/** Returns the staple ingredient names for a given persona. */
export function getPersonaStaples(persona: Persona): string[] {
  return PERSONA_STAPLES[persona];
}

// ── Pantry Classification ───────────────────────────────────────

/**
 * Classifies a recipe's pantry readiness based on the number of missing ingredients.
 * - 0 missing  → 'cook_now'
 * - 1 missing  → '1_ingredient_away'
 * - ≥2 missing → 'needs_shopping'
 */
export function classifyPantryMatch(missingCount: number): PantryClassification {
  if (missingCount === 0) return 'cook_now';
  if (missingCount === 1) return '1_ingredient_away';
  return 'needs_shopping';
}

// ── Ingredient Matching ─────────────────────────────────────────

/** Returns ingredient names from the recipe that are not present in the pantry (case-insensitive). */
export function getMissingIngredients(
  ingredients: RecipeIngredient[],
  pantry: PantryItem[],
): string[] {
  const pantryNames = new Set(pantry.map((p) => p.name.toLowerCase().trim()));
  return ingredients
    .filter((ing) => !pantryNames.has(ing.name.toLowerCase().trim()))
    .map((ing) => ing.name);
}

/**
 * Computes the pantry match percentage for a recipe.
 * Returns a value in [0, 1]: matching ingredients / total ingredients.
 * Returns 1 if the ingredient list is empty (nothing is missing).
 */
export function computePantryMatch(
  ingredients: RecipeIngredient[],
  pantry: PantryItem[],
): number {
  if (ingredients.length === 0) return 1;
  const missing = getMissingIngredients(ingredients, pantry);
  return (ingredients.length - missing.length) / ingredients.length;
}

// ── Effective Pantry ────────────────────────────────────────────

/**
 * Merges DB pantry rows with persona staple defaults at query time.
 * Staples that are already present in the DB rows (by name, case-insensitive) are not duplicated.
 * Synthetic staple items are marked with `isStaple: true` and `isManual: false`.
 */
export function getEffectivePantry(dbItems: PantryItem[], persona: Persona): PantryItem[] {
  const existingNames = new Set(dbItems.map((item) => item.name.toLowerCase().trim()));
  const staples = getPersonaStaples(persona);

  const syntheticStaples: PantryItem[] = staples
    .filter((name) => !existingNames.has(name.toLowerCase().trim()))
    .map((name) => ({
      id: `staple:${name}`,
      userId: '',
      name,
      quantity: null,
      unit: null,
      expiryDate: null,
      isStaple: true,
      isManual: false,
      createdAt: new Date(0).toISOString(),
    }));

  return [...dbItems, ...syntheticStaples];
}
