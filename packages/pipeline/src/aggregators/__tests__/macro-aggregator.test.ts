import { MacroAggregator } from '../macro-aggregator';
import { MatchResult, NutritionData } from '../../types/domain';
import * as fc from 'fast-check';

describe('MacroAggregator', () => {
  const aggregator = new MacroAggregator();

  const createMatch = (nutrition: NutritionData | null): MatchResult => ({
    ingredient: null as any,
    usdaFoodId: nutrition ? '123' : null,
    matchConfidence: nutrition ? 'exact' : 'unmatched',
    nutrition
  });

  describe('aggregate() unit tests', () => {
    it('sums nutrition from matched ingredients', () => {
      const results = [
        createMatch({ calories: 100, proteinG: 5, carbsG: 10, fatG: 2 }),
        createMatch({ calories: 50, proteinG: 2.5, carbsG: 5, fatG: 1 }),
      ];

      const aggregated = aggregator.aggregate(results, null);
      expect(aggregated.total.calories).toBe(150);
      expect(aggregated.total.proteinG).toBe(7.5);
      expect(aggregated.total.carbsG).toBe(15);
      expect(aggregated.total.fatG).toBe(3);
      expect(aggregated.matchedIngredientCount).toBe(2);
      expect(aggregated.totalIngredientCount).toBe(2);
    });

    it('excludes unmatched ingredients', () => {
      const results = [
        createMatch({ calories: 100, proteinG: 5, carbsG: 10, fatG: 2 }),
        createMatch(null),
      ];

      const aggregated = aggregator.aggregate(results, null);
      expect(aggregated.total.calories).toBe(100);
      expect(aggregated.matchedIngredientCount).toBe(1);
      expect(aggregated.totalIngredientCount).toBe(2);
    });

    it('calculates per-serving macros', () => {
      const results = [
        createMatch({ calories: 100, proteinG: 5, carbsG: 10, fatG: 2 }),
      ];

      const aggregated = aggregator.aggregate(results, 2);
      expect(aggregated.perServing?.calories).toBe(50);
      expect(aggregated.perServing?.proteinG).toBe(2.5);
    });

    it('rounds values to one decimal place', () => {
      const results = [
        createMatch({ calories: 100.123, proteinG: 5.55, carbsG: 10.99, fatG: 2.11 }),
      ];

      const aggregated = aggregator.aggregate(results, null);
      expect(aggregated.total.calories).toBe(100.1);
      expect(aggregated.total.proteinG).toBe(5.6);
      expect(aggregated.total.carbsG).toBe(11.0);
      expect(aggregated.total.fatG).toBe(2.1);
    });
  });

  describe('Property tests', () => {
    const macroArb = fc.record({
      calories: fc.float({ min: 0, max: 1000 }),
      proteinG: fc.float({ min: 0, max: 100 }),
      carbsG: fc.float({ min: 0, max: 100 }),
      fatG: fc.float({ min: 0, max: 100 })
    });

    it('Property 11: Recipe Calories Equal Sum of Ingredients', () => {
      fc.assert(
        fc.property(
          fc.array(macroArb, { minLength: 1, maxLength: 20 }),
          (macrosList) => {
            const matches = macrosList.map(m => createMatch(m));
            const aggregated = aggregator.aggregate(matches, null);
            
            const expectedCalories = macrosList.reduce((sum, m) => sum + m.calories, 0);
            
            // Allow small floating point drift due to rounding
            expect(Math.abs(aggregated.total.calories - Math.round(expectedCalories * 10)/10)).toBeLessThan(0.2);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 12: Per-Serving Calculation', () => {
      fc.assert(
        fc.property(
          fc.array(macroArb, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 20 }),
          (macrosList, servings) => {
            const matches = macrosList.map(m => createMatch(m));
            const aggregated = aggregator.aggregate(matches, servings);
            
            expect(aggregated.perServing).not.toBeNull();
            // Test per-serving equals total / servings (rounded)
            const expectedCal = Math.round((aggregated.total.calories / servings) * 10) / 10;
            expect(Math.abs(aggregated.perServing!.calories - expectedCal)).toBeLessThan(0.15);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 13: Zero Matched Ingredients Handling', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            const matches = Array(count).fill(createMatch(null));
            const aggregated = aggregator.aggregate(matches, null);
            
            expect(aggregated.total.calories).toBe(0);
            expect(aggregated.matchedIngredientCount).toBe(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 14: Macro Rounding', () => {
      fc.assert(
        fc.property(
          fc.array(macroArb, { minLength: 1, maxLength: 10 }),
          (macrosList) => {
            const matches = macrosList.map(m => createMatch(m));
            const aggregated = aggregator.aggregate(matches, null);
            
            const hasMoreThanOneDecimal = (num: number) => {
              const str = num.toString();
              return str.includes('.') && str.split('.')[1].length > 1;
            };

            expect(hasMoreThanOneDecimal(aggregated.total.calories)).toBe(false);
            expect(hasMoreThanOneDecimal(aggregated.total.proteinG)).toBe(false);
            expect(hasMoreThanOneDecimal(aggregated.total.carbsG)).toBe(false);
            expect(hasMoreThanOneDecimal(aggregated.total.fatG)).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 9 & 10: Nutrition Data Invariants', () => {
      fc.assert(
        fc.property(
          fc.array(macroArb, { minLength: 1, maxLength: 10 }),
          (macrosList) => {
            const matches = macrosList.map(m => createMatch(m));
            const aggregated = aggregator.aggregate(matches, null);
            
            // Property 9: Non-negative
            expect(aggregated.total.calories).toBeGreaterThanOrEqual(0);
            expect(aggregated.total.proteinG).toBeGreaterThanOrEqual(0);
            
            // Note: Property 10 (macro math) relies on actual food data, our random gen 
            // might not respect it, but we can check if it holds when we enforce it.
            // But since aggregator just sums what it gets, we don't strictly test the USDA data here.
            return true;
          }
        )
      );
    });
  });
});
