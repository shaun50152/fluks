/**
 * Property-based tests for lib/pantry-utils.ts
 *
 * Validates: Requirements 1.3, 4.4, 4.5, 14.4, 14.5
 */

import * as fc from 'fast-check';
import {
  PERSONA_STAPLES,
  getPersonaStaples,
  classifyPantryMatch,
  getMissingIngredients,
  getEffectivePantry,
} from '../pantry-utils';
import type { Persona, PantryItem, RecipeIngredient } from '@/types/domain';

const PERSONAS: Persona[] = ['student', 'employee', 'fitness', 'irregular'];

// ── Arbitraries ─────────────────────────────────────────────────

const pantryItemArb = (overrides?: Partial<PantryItem>): fc.Arbitrary<PantryItem> =>
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    quantity: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    expiryDate: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    isStaple: fc.boolean(),
    isManual: fc.boolean(),
    createdAt: fc.constant(new Date().toISOString()),
    ...overrides,
  });

const manualPantryItemArb = (): fc.Arbitrary<PantryItem> =>
  pantryItemArb({ isManual: fc.constant(true) });

const ingredientArb = (): fc.Arbitrary<RecipeIngredient> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    quantity: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    tags: fc.constant([]),
  });

// ── Property 1: Persona staple seeding ──────────────────────────
// Validates: Requirements 1.3, 14.4
describe('Property 1: Persona staple seeding', () => {
  it('getPersonaStaples returns a non-empty array for every persona', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PERSONAS),
        (persona) => {
          const staples = getPersonaStaples(persona);
          expect(Array.isArray(staples)).toBe(true);
          expect(staples.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getPersonaStaples returns all staples defined in PERSONA_STAPLES for that persona', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PERSONAS),
        (persona) => {
          const staples = getPersonaStaples(persona);
          const expected = PERSONA_STAPLES[persona];
          expect(staples).toEqual(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7: Persona change preserves manual items ───────────
// Validates: Requirements 4.4, 4.5
describe('Property 7: Persona change preserves manual items', () => {
  it('manual items always survive in getEffectivePantry regardless of persona', () => {
    fc.assert(
      fc.property(
        fc.array(manualPantryItemArb(), { minLength: 1, maxLength: 10 }),
        fc.array(pantryItemArb(), { minLength: 0, maxLength: 10 }),
        fc.constantFrom(...PERSONAS),
        (manualItems, otherItems, persona) => {
          const dbItems = [...manualItems, ...otherItems];
          const effective = getEffectivePantry(dbItems, persona);

          // Every manual item must appear in the effective pantry
          for (const manualItem of manualItems) {
            const found = effective.some(item => item.id === manualItem.id);
            expect(found).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('manual items retain isManual=true in the effective pantry', () => {
    fc.assert(
      fc.property(
        fc.array(manualPantryItemArb(), { minLength: 1, maxLength: 5 }),
        fc.constantFrom(...PERSONAS),
        (manualItems, persona) => {
          const effective = getEffectivePantry(manualItems, persona);
          for (const manualItem of manualItems) {
            const found = effective.find(item => item.id === manualItem.id);
            expect(found).toBeDefined();
            expect(found!.isManual).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 25: Pantry classification coverage invariant ────────
// Validates: Requirements 4.4, 14.4, 14.5
describe('Property 25: Pantry classification coverage invariant', () => {
  it('union of all classifications equals the full set of recipes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ingredients: fc.array(ingredientArb(), { minLength: 0, maxLength: 8 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.array(pantryItemArb(), { minLength: 0, maxLength: 10 }),
        (recipes, pantry) => {
          const cookNow: typeof recipes = [];
          const oneAway: typeof recipes = [];
          const needsShopping: typeof recipes = [];

          for (const recipe of recipes) {
            const missing = getMissingIngredients(recipe.ingredients, pantry);
            const classification = classifyPantryMatch(missing.length);
            if (classification === 'cook_now') cookNow.push(recipe);
            else if (classification === '1_ingredient_away') oneAway.push(recipe);
            else needsShopping.push(recipe);
          }

          const union = [...cookNow, ...oneAway, ...needsShopping];
          expect(union.length).toBe(recipes.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 26: Pantry classification correctness ───────────────
// Validates: Requirements 4.4, 14.4, 14.5
describe('Property 26: Pantry classification correctness', () => {
  it('0 missing ingredients → cook_now', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (missingCount) => {
          fc.pre(missingCount === 0);
          expect(classifyPantryMatch(missingCount)).toBe('cook_now');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('exactly 0 missing → cook_now', () => {
    expect(classifyPantryMatch(0)).toBe('cook_now');
  });

  it('exactly 1 missing → 1_ingredient_away', () => {
    expect(classifyPantryMatch(1)).toBe('1_ingredient_away');
  });

  it('≥2 missing → needs_shopping', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        (missingCount) => {
          expect(classifyPantryMatch(missingCount)).toBe('needs_shopping');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('classifyPantryMatch is consistent with getMissingIngredients output', () => {
    fc.assert(
      fc.property(
        fc.array(ingredientArb(), { minLength: 0, maxLength: 10 }),
        fc.array(pantryItemArb(), { minLength: 0, maxLength: 10 }),
        (ingredients, pantry) => {
          const missing = getMissingIngredients(ingredients, pantry);
          const classification = classifyPantryMatch(missing.length);

          if (missing.length === 0) {
            expect(classification).toBe('cook_now');
          } else if (missing.length === 1) {
            expect(classification).toBe('1_ingredient_away');
          } else {
            expect(classification).toBe('needs_shopping');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
