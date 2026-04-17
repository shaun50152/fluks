/**
 * Property-based tests for lib/recommendation-engine.ts
 *
 * Validates: Requirements 3.4, 5.6, 5.7, 5.8
 */

import * as fc from 'fast-check';
import { applyDietaryFilter, getDecisionCandidates } from '../recommendation-engine';
import type {
  Recipe,
  DietaryTag,
  RecipeIngredient,
  Macros,
  PantryItem,
  BehaviorEvent,
  MealWindow,
  Goal,
  UserSignalVector,
} from '@/types/domain';

// ── Arbitraries ─────────────────────────────────────────────────

const DIETARY_TAGS: DietaryTag[] = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_free',
];

const GOALS: Goal[] = ['build_muscle', 'lose_fat', 'maintain', 'improve_energy', 'eat_cleaner'];

const macrosArb = (): fc.Arbitrary<Macros> =>
  fc.record({
    calories: fc.integer({ min: 0, max: 2000 }),
    protein: fc.integer({ min: 0, max: 200 }),
    carbs: fc.integer({ min: 0, max: 300 }),
    fat: fc.integer({ min: 0, max: 100 }),
  });

const ingredientArb = (): fc.Arbitrary<RecipeIngredient> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    quantity: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
    tags: fc.array(fc.constantFrom(...DIETARY_TAGS), { minLength: 0, maxLength: 3 }),
  });

const recipeArb = (): fc.Arbitrary<Recipe> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
    ingredients: fc.array(ingredientArb(), { minLength: 0, maxLength: 6 }),
    steps: fc.constant([]),
    macros: macrosArb(),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    cookTime: fc.integer({ min: 1, max: 120 }),
    mediaUrl: fc.constant(null),
    mediaType: fc.constant(null),
    authorId: fc.constant(null),
    createdAt: fc.constant(new Date().toISOString()),
  });

const pantryItemArb = (): fc.Arbitrary<PantryItem> =>
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
    quantity: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
    expiryDate: fc.constant(null),
    isStaple: fc.boolean(),
    isManual: fc.boolean(),
    createdAt: fc.constant(new Date().toISOString()),
  });

const mealWindowArb = (): fc.Arbitrary<MealWindow> =>
  fc.record({
    id: fc.uuid(),
    schedulePatternId: fc.uuid(),
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    windowName: fc.constantFrom('breakfast', 'lunch', 'dinner', 'snack'),
    startTime: fc.constant('08:00'),
    endTime: fc.constant('09:00'),
    isManualOverride: fc.boolean(),
  });

const userSignalVectorArb = (): fc.Arbitrary<UserSignalVector> =>
  fc.record({
    userId: fc.uuid(),
    goals: fc.array(fc.constantFrom(...GOALS), { minLength: 1, maxLength: 3 }),
    dietaryTags: fc.array(fc.constantFrom(...DIETARY_TAGS), { minLength: 0, maxLength: 3 }),
    pantryItems: fc.array(pantryItemArb(), { minLength: 1, maxLength: 10 }),
    recentEvents: fc.constant<BehaviorEvent[]>([]),
    mealWindow: mealWindowArb(),
  });

// ── Property 4: Dietary restriction filtering is a subset ────────
// Validates: Requirements 3.4, 5.6
describe('Property 4: Dietary restriction filtering is a subset', () => {
  it('filtered recipes are always a subset of the original recipes', () => {
    fc.assert(
      fc.property(
        fc.array(recipeArb(), { minLength: 0, maxLength: 20 }),
        fc.array(fc.constantFrom(...DIETARY_TAGS), { minLength: 0, maxLength: 4 }),
        (recipes, restrictions) => {
          const filtered = applyDietaryFilter(recipes, restrictions);

          // Every recipe in filtered must exist in the original set
          for (const filteredRecipe of filtered) {
            const found = recipes.some((r) => r.id === filteredRecipe.id);
            expect(found).toBe(true);
          }

          // Filtered set cannot be larger than original
          expect(filtered.length).toBeLessThanOrEqual(recipes.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 8: RecommendationEngine returns at least one candidate ──
// Validates: Requirements 5.7, 5.8
describe('Property 8: RecommendationEngine returns at least one candidate', () => {
  it('getDecisionCandidates always returns a non-empty array given at least one recipe', () => {
    fc.assert(
      fc.property(
        userSignalVectorArb(),
        fc.array(recipeArb(), { minLength: 1, maxLength: 20 }),
        (signals, recipes) => {
          const candidates = getDecisionCandidates(signals, recipes);
          expect(candidates.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
