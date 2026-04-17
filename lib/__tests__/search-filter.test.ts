/**
 * Property-based tests for search filter invariants
 *
 * **Validates: Requirements 14.6, 14.7**
 */

import * as fc from 'fast-check';
import { applySearchFilters, EMPTY_FILTERS } from '../search-utils';
import type { SearchFilters } from '../search-utils';
import type {
  DietaryTag,
  Goal,
  PantryClassification,
  PantryItem,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  Macros,
} from '@/types/domain';

// ── Enum pools ───────────────────────────────────────────────────

const DIETARY_TAGS: DietaryTag[] = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_free',
];
const GOALS: Goal[] = [
  'build_muscle', 'lose_fat', 'maintain', 'improve_energy', 'eat_cleaner',
];
const PANTRY_CLASSIFICATIONS: PantryClassification[] = [
  'cook_now', '1_ingredient_away', 'needs_shopping',
];

// ── Arbitraries ──────────────────────────────────────────────────

const macrosArb = (): fc.Arbitrary<Macros> =>
  fc.record<Macros>({
    calories: fc.nat(5000),
    protein: fc.nat(500),
    carbs: fc.nat(500),
    fat: fc.nat(500),
  });

const ingredientArb = (): fc.Arbitrary<RecipeIngredient> =>
  fc.record<RecipeIngredient>({
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    quantity: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
    tags: fc.array(fc.constantFrom(...DIETARY_TAGS), { minLength: 0, maxLength: 3 }),
  });

const recipeStepArb = (): fc.Arbitrary<RecipeStep> =>
  fc.record<RecipeStep>({
    order: fc.integer({ min: 1, max: 20 }),
    instruction: fc.string({ minLength: 1, maxLength: 100 }),
  });

const recipeArb = (): fc.Arbitrary<Recipe> =>
  fc.record<Recipe>({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 80 }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
    ingredients: fc.array(ingredientArb(), { minLength: 0, maxLength: 6 }),
    steps: fc.array(recipeStepArb(), { minLength: 0, maxLength: 5 }),
    macros: macrosArb(),
    tags: fc.array(
      fc.oneof(
        fc.constantFrom(...DIETARY_TAGS),
        fc.constantFrom(...GOALS),
        fc.string({ minLength: 1, maxLength: 20 }),
      ),
      { minLength: 0, maxLength: 6 },
    ),
    cookTime: fc.integer({ min: 0, max: 480 }),
    mediaUrl: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    mediaType: fc.option(fc.constantFrom<'image' | 'video'>('image', 'video'), { nil: null }),
    authorId: fc.option(fc.uuid(), { nil: null }),
    createdAt: fc.constant(new Date().toISOString()),
  });

const pantryItemArb = (): fc.Arbitrary<PantryItem> =>
  fc.record<PantryItem>({
    id: fc.uuid(),
    userId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    quantity: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
    expiryDate: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    isStaple: fc.boolean(),
    isManual: fc.boolean(),
    createdAt: fc.constant(new Date().toISOString()),
  });

/** Generates a SearchFilters with at least one active filter (non-empty). */
const activeFiltersArb = (): fc.Arbitrary<SearchFilters> =>
  fc.record<SearchFilters>({
    dietary: fc.option(fc.constantFrom(...DIETARY_TAGS), { nil: null }),
    goal: fc.option(fc.constantFrom(...GOALS), { nil: null }),
    cookTime: fc.constantFrom('any', '<15', '<30', '<60'),
    pantry: fc.constantFrom('any', ...PANTRY_CLASSIFICATIONS),
  });

// ── Property 27: Search filter subset (metamorphic) ──────────────
// Validates: Requirements 14.6

describe('Property 27: Search filter subset (metamorphic)', () => {
  it('applySearchFilters(recipes, F) ⊆ applySearchFilters(recipes, noFilter) for any filter F', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb(), { minLength: 0, maxLength: 20 }),
        activeFiltersArb(),
        fc.array(pantryItemArb(), { minLength: 0, maxLength: 10 }),
        (recipes, filters, pantry) => {
          const unfiltered = applySearchFilters(recipes, EMPTY_FILTERS, pantry);
          const filtered = applySearchFilters(recipes, filters, pantry);

          // Every recipe in the filtered set must also appear in the unfiltered set
          const unfilteredIds = new Set(unfiltered.map((r) => r.id));
          for (const recipe of filtered) {
            expect(unfilteredIds.has(recipe.id)).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('filtered result count is always ≤ unfiltered result count', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb(), { minLength: 0, maxLength: 20 }),
        activeFiltersArb(),
        fc.array(pantryItemArb(), { minLength: 0, maxLength: 10 }),
        (recipes, filters, pantry) => {
          const unfiltered = applySearchFilters(recipes, EMPTY_FILTERS, pantry);
          const filtered = applySearchFilters(recipes, filters, pantry);
          expect(filtered.length).toBeLessThanOrEqual(unfiltered.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ── Property 28: Search filter idempotence ───────────────────────
// Validates: Requirements 14.7

describe('Property 28: Search filter idempotence', () => {
  it('applySearchFilters(applySearchFilters(recipes, F), F) deep-equals applySearchFilters(recipes, F)', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb(), { minLength: 0, maxLength: 20 }),
        activeFiltersArb(),
        fc.array(pantryItemArb(), { minLength: 0, maxLength: 10 }),
        (recipes, filters, pantry) => {
          const once = applySearchFilters(recipes, filters, pantry);
          const twice = applySearchFilters(once, filters, pantry);
          expect(twice).toEqual(once);
        },
      ),
      { numRuns: 200 },
    );
  });
});
