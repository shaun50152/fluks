import * as fc from 'fast-check';
import { NormalizedRecipe, EnrichmentStatus } from '../../types/domain';

/**
 * Property-Based Tests for Recipe Normalizer
 * 
 * These tests verify universal properties that should hold across all valid inputs.
 */

describe('RecipeNormalizer - Property Tests', () => {
  /**
   * Property 4: Recipe Serialization Round-Trip
   * **Validates: Requirements 5.8**
   * 
   * For any NormalizedRecipe record, serializing the record to JSON and 
   * deserializing it SHALL produce a record equal to the original.
   */
  describe('Property 4: Recipe Serialization Round-Trip', () => {
    it('should preserve all data through JSON serialization round-trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            source: fc.constant('themealdb' as const),
            sourceRecipeId: fc.string({ minLength: 1, maxLength: 20 }),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.oneof(fc.constant(null), fc.string({ maxLength: 500 })),
            imageUrl: fc.webUrl(),
            mediaUrl: fc.oneof(fc.constant(null), fc.webUrl()),
            mediaType: fc.oneof(fc.constant(null), fc.constantFrom('image' as const, 'video' as const)),
            category: fc.string({ minLength: 1, maxLength: 50 }),
            cuisine: fc.string({ minLength: 1, maxLength: 50 }),
            instructions: fc.string({ minLength: 1, maxLength: 5000 }),
            ingredients: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                amount: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 1000, noNaN: true })),
                unit: fc.oneof(fc.constant(null), fc.constantFrom('cup', 'tbsp', 'tsp', 'g', 'oz', 'lb', 'ml', 'l')),
                rawText: fc.string({ minLength: 1, maxLength: 200 })
              }),
              { minLength: 1, maxLength: 20 }
            ),
            steps: fc.array(
              fc.record({
                order: fc.integer({ min: 1, max: 50 }),
                instruction: fc.string({ minLength: 1, maxLength: 500 })
              }),
              { minLength: 0, maxLength: 20 }
            ),
            servings: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 20 })),
            cookTime: fc.integer({ min: 0, max: 600 }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
            macros: fc.record({
              calories: fc.double({ min: 0, max: 5000, noNaN: true }),
              protein: fc.double({ min: 0, max: 500, noNaN: true }),
              carbs: fc.double({ min: 0, max: 1000, noNaN: true }),
              fat: fc.double({ min: 0, max: 500, noNaN: true })
            }),
            enrichmentStatus: fc.constantFrom<EnrichmentStatus>('pending', 'complete', 'partial', 'failed'),
            unmatchedIngredients: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 20 }),
            authorId: fc.constant(null),
            createdAt: fc.date().map(d => d.toISOString()),
            updatedAt: fc.date().map(d => d.toISOString())
          }),
          (recipe: NormalizedRecipe) => {
            // Perform JSON serialization round-trip
            const serialized = JSON.stringify(recipe);
            const deserialized = JSON.parse(serialized);

            // Assert deep equality
            expect(deserialized).toEqual(recipe);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
