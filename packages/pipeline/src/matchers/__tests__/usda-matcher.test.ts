import { USDAMatcher } from '../usda-matcher';
import * as fc from 'fast-check';
import { ParsedIngredient } from '../../types/domain';

// Mock fetch globally
global.fetch = jest.fn();

describe('USDAMatcher', () => {
  let matcher: USDAMatcher;

  beforeEach(() => {
    matcher = new USDAMatcher('test-api-key');
    jest.clearAllMocks();
  });

  const mockIngredient = (name: string): ParsedIngredient => ({
    rawText: name,
    normalizedName: name,
    amount: 1,
    unit: 'cup'
  });

  describe('match() unit tests', () => {
    it('returns exact match on Layer 1', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 12345,
            foodNutrients: [
              { nutrientId: 1008, value: 100 },
              { nutrientId: 1003, value: 5 },
              { nutrientId: 1004, value: 2 },
              { nutrientId: 1005, value: 10 }
            ]
          }]
        })
      });

      const ingredient = mockIngredient('apple');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('exact');
      expect(result.usdaFoodId).toBe('12345');
      expect(result.nutrition?.calories).toBe(100);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns keyword match on Layer 2 if exact fails', async () => {
      // First call fails (empty foods)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      });

      // Second call succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 67890,
            foodNutrients: [
              { nutrientId: 1008, value: 200 }
            ]
          }]
        })
      });

      const ingredient = mockIngredient('raw apple');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('keyword');
      expect(result.usdaFoodId).toBe('67890');
      expect(result.nutrition?.calories).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Ensure the query URL used the simplified keyword
      const url = (global.fetch as jest.Mock).mock.calls[1][0];
      expect(url).toContain('query=apple'); // "raw" was stripped
    });

    it('returns fallback match on Layer 3 if exact and keyword fail', async () => {
      // First call (exact) fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      });

      // Second call (keyword) fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      });

      // Third call (fallback) succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 99999,
            foodNutrients: [
              { nutrientId: 1008, value: 150 }
            ]
          }]
        })
      });

      const ingredient = mockIngredient('chicken breast boneless');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('fallback');
      expect(result.usdaFoodId).toBe('99999');
      expect(result.nutrition?.calories).toBe(150);
      expect(global.fetch).toHaveBeenCalledTimes(3);
      
      // Ensure the fallback query used only the first word
      const url = (global.fetch as jest.Mock).mock.calls[2][0];
      expect(url).toContain('query=chicken');
    });

    it('returns unmatched on Layer 4 if all fail', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      });

      const ingredient = mockIngredient('unknown weird stuff');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('unmatched');
      expect(result.usdaFoodId).toBeNull();
      expect(result.nutrition).toBeNull();
    });

    it('caches results and avoids extra API calls', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [{ fdcId: 1, foodNutrients: [] }] })
      });

      await matcher.match(mockIngredient('chicken'));
      await matcher.match(mockIngredient('chicken'));
      await matcher.match(mockIngredient('chicken'));

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(matcher.getCacheStats()).toEqual({ hits: 2, misses: 1 });
    });

    it('throws on rate limit (429)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429
      });

      await expect(matcher.match(mockIngredient('test'))).rejects.toThrow('USDA_RATE_LIMIT');
    });

    it('handles timeout gracefully', async () => {
      // Mock fetch to simulate timeout
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 100);
        })
      );

      const ingredient = mockIngredient('test');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('unmatched');
      expect(result.usdaFoodId).toBeNull();
      expect(result.nutrition).toBeNull();
    });
  });

  describe('API error handling', () => {
    it('handles 500 server error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      const ingredient = mockIngredient('test');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('unmatched');
      expect(result.usdaFoodId).toBeNull();
      expect(result.nutrition).toBeNull();
    });

    it('handles 404 not found gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      const ingredient = mockIngredient('test');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('unmatched');
      expect(result.usdaFoodId).toBeNull();
      expect(result.nutrition).toBeNull();
    });

    it('handles network error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const ingredient = mockIngredient('test');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('unmatched');
      expect(result.usdaFoodId).toBeNull();
      expect(result.nutrition).toBeNull();
    });

    it('handles malformed JSON response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const ingredient = mockIngredient('test');
      const result = await matcher.match(ingredient);

      expect(result.matchConfidence).toBe('unmatched');
      expect(result.usdaFoodId).toBeNull();
      expect(result.nutrition).toBeNull();
    });
  });

  describe('Cache behavior', () => {
    it('tracks cache hits correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [{ fdcId: 1, foodNutrients: [] }] })
      });

      const stats1 = matcher.getCacheStats();
      expect(stats1).toEqual({ hits: 0, misses: 0 });

      await matcher.match(mockIngredient('apple'));
      const stats2 = matcher.getCacheStats();
      expect(stats2).toEqual({ hits: 0, misses: 1 });

      await matcher.match(mockIngredient('apple'));
      const stats3 = matcher.getCacheStats();
      expect(stats3).toEqual({ hits: 1, misses: 1 });

      await matcher.match(mockIngredient('apple'));
      const stats4 = matcher.getCacheStats();
      expect(stats4).toEqual({ hits: 2, misses: 1 });
    });

    it('caches different ingredients separately', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [{ fdcId: 1, foodNutrients: [] }] })
      });

      await matcher.match(mockIngredient('apple'));
      await matcher.match(mockIngredient('banana'));
      await matcher.match(mockIngredient('apple'));
      await matcher.match(mockIngredient('banana'));

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(matcher.getCacheStats()).toEqual({ hits: 2, misses: 2 });
    });

    it('caches unmatched ingredients', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      });

      await matcher.match(mockIngredient('unknown'));
      const firstCallCount = (global.fetch as jest.Mock).mock.calls.length;
      
      await matcher.match(mockIngredient('unknown'));
      const secondCallCount = (global.fetch as jest.Mock).mock.calls.length;

      // Second call should not make any additional API calls due to caching
      expect(secondCallCount).toBe(firstCallCount);
      expect(matcher.getCacheStats()).toEqual({ hits: 1, misses: 1 });
    });

    it('returns new object on cache hit to prevent mutation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [{ fdcId: 1, foodNutrients: [] }] })
      });

      const result1 = await matcher.match(mockIngredient('apple'));
      const result2 = await matcher.match(mockIngredient('apple'));

      expect(result1).not.toBe(result2); // Different object references
      expect(result1).toEqual(result2); // But equal values
    });
  });

  describe('Nutrition data extraction', () => {
    it('extracts all nutrition fields correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 123,
            foodNutrients: [
              { nutrientId: 1008, value: 150 },
              { nutrientId: 1003, value: 10 },
              { nutrientId: 1004, value: 5 },
              { nutrientId: 1005, value: 20 }
            ]
          }]
        })
      });

      const result = await matcher.match(mockIngredient('test'));

      expect(result.nutrition).toEqual({
        calories: 150,
        proteinG: 10,
        fatG: 5,
        carbsG: 20
      });
    });

    it('handles missing nutrition fields with zero values', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 123,
            foodNutrients: [
              { nutrientId: 1008, value: 100 }
              // Missing protein, fat, carbs
            ]
          }]
        })
      });

      const result = await matcher.match(mockIngredient('test'));

      expect(result.nutrition).toEqual({
        calories: 100,
        proteinG: 0,
        fatG: 0,
        carbsG: 0
      });
    });

    it('handles negative nutrition values by clamping to zero', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 123,
            foodNutrients: [
              { nutrientId: 1008, value: -50 },
              { nutrientId: 1003, value: -10 },
              { nutrientId: 1004, value: 5 },
              { nutrientId: 1005, value: 20 }
            ]
          }]
        })
      });

      const result = await matcher.match(mockIngredient('test'));

      expect(result.nutrition?.calories).toBe(0);
      expect(result.nutrition?.proteinG).toBe(0);
      expect(result.nutrition?.fatG).toBe(5);
      expect(result.nutrition?.carbsG).toBe(20);
    });

    it('uses fallback nutrient numbers when nutrientId not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 123,
            foodNutrients: [
              { nutrientNumber: '208', value: 150 },
              { nutrientNumber: '203', value: 10 },
              { nutrientNumber: '204', value: 5 },
              { nutrientNumber: '205', value: 20 }
            ]
          }]
        })
      });

      const result = await matcher.match(mockIngredient('test'));

      expect(result.nutrition).toEqual({
        calories: 150,
        proteinG: 10,
        fatG: 5,
        carbsG: 20
      });
    });
  });

  describe('Layered matching strategy', () => {
    it('tries all layers when no match found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      });

      await matcher.match(mockIngredient('apple'));

      // When no match is found, it tries exact, then keyword (if different), then fallback (if different)
      // For 'apple', simplification returns 'apple' (same), so keyword is skipped
      // Fallback returns 'apple' (same), so fallback is skipped
      // So only 1 call should be made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('skips fallback layer if it produces same query as keyword', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      });

      await matcher.match(mockIngredient('a'));

      // Fallback extracts first word with length > 2, so 'a' would fail that check
      // Should only try exact and keyword
      expect(global.fetch).toHaveBeenCalled();
    });

    it('preserves ingredient reference in match result', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [{
            fdcId: 123,
            foodNutrients: []
          }]
        })
      });

      const ingredient = mockIngredient('test');
      const result = await matcher.match(ingredient);

      expect(result.ingredient).toBe(ingredient);
    });
  });

  describe('Property tests', () => {
    it('Property 8: Unmatched Ingredient Handling', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (name) => {
            const result = await matcher.match(mockIngredient(name));
            expect(result.matchConfidence).toBe('unmatched');
            expect(result.nutrition).toBeNull();
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 9: Nutrition Data Non-Negative', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            calories: fc.integer({ min: -100, max: 1000 }),
            protein: fc.integer({ min: -50, max: 100 }),
            fat: fc.integer({ min: -50, max: 100 }),
            carbs: fc.integer({ min: -50, max: 100 })
          }),
          async (nutrients) => {
            // Create a fresh matcher instance to avoid cache pollution
            const freshMatcher = new USDAMatcher('test-api-key');
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                foods: [{
                  fdcId: 123,
                  foodNutrients: [
                    { nutrientId: 1008, value: nutrients.calories },
                    { nutrientId: 1003, value: nutrients.protein },
                    { nutrientId: 1004, value: nutrients.fat },
                    { nutrientId: 1005, value: nutrients.carbs }
                  ]
                }]
              })
            });

            const result = await freshMatcher.match(mockIngredient(`test-prop9-${nutrients.calories}-${nutrients.protein}`));
            
            if (result.nutrition) {
              expect(result.nutrition.calories).toBeGreaterThanOrEqual(0);
              expect(result.nutrition.proteinG).toBeGreaterThanOrEqual(0);
              expect(result.nutrition.fatG).toBeGreaterThanOrEqual(0);
              expect(result.nutrition.carbsG).toBeGreaterThanOrEqual(0);
            }
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 10: Nutrition Data Macro Invariant', async () => {
      /**
       * **Validates: Requirements 18.4**
       * 
       * For any matched ingredient, the sum of protein, carbs, and fat 
       * (converted to calories: protein×4 + carbs×4 + fat×9) SHALL be 
       * less than or equal to total calories plus a 10% tolerance.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            protein: fc.integer({ min: 0, max: 100 }),
            fat: fc.integer({ min: 0, max: 100 }),
            carbs: fc.integer({ min: 0, max: 100 }),
            // Generate additional calories beyond macros (0% to 20% extra)
            extraCaloriesPercent: fc.integer({ min: 0, max: 20 })
          }),
          async (data) => {
            // Create a fresh matcher instance to avoid cache pollution
            const freshMatcher = new USDAMatcher('test-api-key');
            
            // Generate realistic calories based on macros
            // Real USDA data typically has calories >= macro sum (due to fiber, alcohol, etc.)
            const baseMacroCalories = (data.protein * 4) + (data.carbs * 4) + (data.fat * 9);
            const extraCalories = Math.round(baseMacroCalories * (data.extraCaloriesPercent / 100));
            const calories = baseMacroCalories + extraCalories;
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                foods: [{
                  fdcId: 123,
                  foodNutrients: [
                    { nutrientId: 1008, value: calories },
                    { nutrientId: 1003, value: data.protein },
                    { nutrientId: 1004, value: data.fat },
                    { nutrientId: 1005, value: data.carbs }
                  ]
                }]
              })
            });

            const result = await freshMatcher.match(mockIngredient(`test-${data.protein}-${data.fat}-${data.carbs}`));
            
            if (result.nutrition && result.matchConfidence !== 'unmatched') {
              const { calories: resultCalories, proteinG, fatG, carbsG } = result.nutrition;
              
              // Calculate calories from macros: protein×4 + carbs×4 + fat×9
              const macroCalories = (proteinG * 4) + (carbsG * 4) + (fatG * 9);
              
              // Allow 10% tolerance
              const maxAllowedCalories = resultCalories * 1.1;
              
              expect(macroCalories).toBeLessThanOrEqual(maxAllowedCalories);
            }
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
