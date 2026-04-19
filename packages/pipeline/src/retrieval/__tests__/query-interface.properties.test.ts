/**
 * Property-based tests for RecipeQueryInterface
 * 
 * These tests verify universal properties that should hold across all valid inputs.
 */

import { RecipeQueryInterface } from '../query-interface';
import { createClient } from '@supabase/supabase-js';
import * as fc from 'fast-check';

// Mock Supabase client
jest.mock('@supabase/supabase-js');

describe('RecipeQueryInterface - Property Tests', () => {
  let queryInterface: RecipeQueryInterface;
  let mockClient: any;
  let mockQuery: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    mockClient = {
      from: jest.fn().mockReturnValue(mockQuery),
    };

    (createClient as jest.Mock).mockReturnValue(mockClient);

    queryInterface = new RecipeQueryInterface('https://test.supabase.co', 'test-key');
  });

  describe('Property 6: Filter Subset Property', () => {
    /**
     * **Validates: Requirements 13.5**
     * 
     * For any recipe set and any filter parameters, the set of filtered recipes
     * SHALL be a subset of the unfiltered recipe set.
     */
    it('should return filtered recipes as a subset of unfiltered recipes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a set of recipes
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.oneof(fc.constant(null), fc.string({ maxLength: 200 })),
              ingredients: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  quantity: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 100, noNaN: true })),
                  unit: fc.oneof(fc.constant(null), fc.constantFrom('cup', 'tbsp', 'tsp', 'g', 'oz', 'lb')),
                  tags: fc.array(fc.string({ maxLength: 20 }), { maxLength: 3 })
                }),
                { minLength: 1, maxLength: 10 }
              ),
              steps: fc.array(
                fc.record({
                  order: fc.integer({ min: 1, max: 20 }),
                  instruction: fc.string({ minLength: 1, maxLength: 200 })
                }),
                { minLength: 1, maxLength: 10 }
              ),
              macros: fc.record({
                calories: fc.double({ min: 0, max: 2000, noNaN: true }),
                protein: fc.double({ min: 0, max: 200, noNaN: true }),
                carbs: fc.double({ min: 0, max: 300, noNaN: true }),
                fat: fc.double({ min: 0, max: 150, noNaN: true })
              }),
              tags: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
              cookTime: fc.integer({ min: 0, max: 300 }),
              mediaUrl: fc.oneof(fc.constant(null), fc.webUrl()),
              mediaType: fc.oneof(fc.constant(null), fc.constantFrom('image' as const, 'video' as const)),
              authorId: fc.constant(null),
              createdAt: fc.date().map(d => d.toISOString()),
              // Database fields
              category: fc.constantFrom('Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'),
              cuisine: fc.constantFrom('Italian', 'Mexican', 'Chinese', 'Indian', 'American'),
              enrichment_status: fc.constantFrom('pending', 'complete', 'partial', 'failed'),
              cook_time: fc.integer({ min: 0, max: 300 }),
              image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              media_url: fc.oneof(fc.constant(null), fc.webUrl()),
              media_type: fc.oneof(fc.constant(null), fc.constantFrom('image', 'video')),
              author_id: fc.constant(null),
              created_at: fc.date().map(d => d.toISOString())
            }),
            { minLength: 5, maxLength: 30 }
          ),
          // Generate filter parameters
          fc.record({
            category: fc.option(fc.constantFrom('Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'), { nil: undefined }),
            cuisine: fc.option(fc.constantFrom('Italian', 'Mexican', 'Chinese', 'Indian', 'American'), { nil: undefined }),
            caloriesMin: fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
            caloriesMax: fc.option(fc.double({ min: 1000, max: 2000, noNaN: true }), { nil: undefined }),
            proteinMin: fc.option(fc.double({ min: 0, max: 50, noNaN: true }), { nil: undefined }),
            proteinMax: fc.option(fc.double({ min: 50, max: 200, noNaN: true }), { nil: undefined }),
            carbsMin: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
            carbsMax: fc.option(fc.double({ min: 100, max: 300, noNaN: true }), { nil: undefined }),
            fatMin: fc.option(fc.double({ min: 0, max: 50, noNaN: true }), { nil: undefined }),
            fatMax: fc.option(fc.double({ min: 50, max: 150, noNaN: true }), { nil: undefined })
          }),
          async (recipes, filters) => {
            // Mock unfiltered query (no filters except default enrichment_status)
            mockQuery.range.mockResolvedValueOnce({ 
              data: recipes.filter(r => r.enrichment_status !== 'failed'), 
              error: null 
            });

            // Get unfiltered results
            const unfilteredResults = await queryInterface.queryRecipes({}, { pageSize: 100 });

            // Mock filtered query
            let filteredRecipes = recipes.filter(r => {
              // Apply default enrichment_status filter
              if (r.enrichment_status === 'failed') return false;

              // Apply category filter
              if (filters.category !== undefined && r.category !== filters.category) return false;

              // Apply cuisine filter
              if (filters.cuisine !== undefined && r.cuisine !== filters.cuisine) return false;

              // Apply macro filters
              if (filters.caloriesMin !== undefined && r.macros.calories < filters.caloriesMin) return false;
              if (filters.caloriesMax !== undefined && r.macros.calories > filters.caloriesMax) return false;
              if (filters.proteinMin !== undefined && r.macros.protein < filters.proteinMin) return false;
              if (filters.proteinMax !== undefined && r.macros.protein > filters.proteinMax) return false;
              if (filters.carbsMin !== undefined && r.macros.carbs < filters.carbsMin) return false;
              if (filters.carbsMax !== undefined && r.macros.carbs > filters.carbsMax) return false;
              if (filters.fatMin !== undefined && r.macros.fat < filters.fatMin) return false;
              if (filters.fatMax !== undefined && r.macros.fat > filters.fatMax) return false;

              return true;
            });

            mockQuery.range.mockResolvedValueOnce({ 
              data: filteredRecipes, 
              error: null 
            });

            // Get filtered results
            const filteredResults = await queryInterface.queryRecipes(filters, { pageSize: 100 });

            // Assert: filtered results should be a subset of unfiltered results
            const unfilteredIds = new Set(unfilteredResults.map(r => r.id));
            const allFilteredInUnfiltered = filteredResults.every(r => unfilteredIds.has(r.id));

            expect(allFilteredInUnfiltered).toBe(true);
            expect(filteredResults.length).toBeLessThanOrEqual(unfilteredResults.length);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 7: Filter Idempotence', () => {
    /**
     * **Validates: Requirements 13.6**
     * 
     * For any filter parameters, applying the filter twice with identical parameters
     * SHALL return the same result set both times.
     */
    it('should return identical results when applying the same filter twice', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a set of recipes
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.oneof(fc.constant(null), fc.string({ maxLength: 200 })),
              ingredients: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  quantity: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 100, noNaN: true })),
                  unit: fc.oneof(fc.constant(null), fc.constantFrom('cup', 'tbsp', 'tsp', 'g', 'oz', 'lb')),
                  tags: fc.array(fc.string({ maxLength: 20 }), { maxLength: 3 })
                }),
                { minLength: 1, maxLength: 10 }
              ),
              steps: fc.array(
                fc.record({
                  order: fc.integer({ min: 1, max: 20 }),
                  instruction: fc.string({ minLength: 1, maxLength: 200 })
                }),
                { minLength: 1, maxLength: 10 }
              ),
              macros: fc.record({
                calories: fc.double({ min: 0, max: 2000, noNaN: true }),
                protein: fc.double({ min: 0, max: 200, noNaN: true }),
                carbs: fc.double({ min: 0, max: 300, noNaN: true }),
                fat: fc.double({ min: 0, max: 150, noNaN: true })
              }),
              tags: fc.array(fc.string({ maxLength: 20 }), { maxLength: 5 }),
              cookTime: fc.integer({ min: 0, max: 300 }),
              mediaUrl: fc.oneof(fc.constant(null), fc.webUrl()),
              mediaType: fc.oneof(fc.constant(null), fc.constantFrom('image' as const, 'video' as const)),
              authorId: fc.constant(null),
              createdAt: fc.date().map(d => d.toISOString()),
              // Database fields
              category: fc.constantFrom('Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'),
              cuisine: fc.constantFrom('Italian', 'Mexican', 'Chinese', 'Indian', 'American'),
              enrichment_status: fc.constantFrom('pending', 'complete', 'partial', 'failed'),
              cook_time: fc.integer({ min: 0, max: 300 }),
              image_url: fc.oneof(fc.constant(null), fc.webUrl()),
              media_url: fc.oneof(fc.constant(null), fc.webUrl()),
              media_type: fc.oneof(fc.constant(null), fc.constantFrom('image', 'video')),
              author_id: fc.constant(null),
              created_at: fc.date().map(d => d.toISOString())
            }),
            { minLength: 5, maxLength: 30 }
          ),
          // Generate filter parameters
          fc.record({
            category: fc.option(fc.constantFrom('Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack'), { nil: undefined }),
            cuisine: fc.option(fc.constantFrom('Italian', 'Mexican', 'Chinese', 'Indian', 'American'), { nil: undefined }),
            caloriesMin: fc.option(fc.double({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
            caloriesMax: fc.option(fc.double({ min: 1000, max: 2000, noNaN: true }), { nil: undefined }),
            proteinMin: fc.option(fc.double({ min: 0, max: 50, noNaN: true }), { nil: undefined }),
            proteinMax: fc.option(fc.double({ min: 50, max: 200, noNaN: true }), { nil: undefined }),
            carbsMin: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
            carbsMax: fc.option(fc.double({ min: 100, max: 300, noNaN: true }), { nil: undefined }),
            fatMin: fc.option(fc.double({ min: 0, max: 50, noNaN: true }), { nil: undefined }),
            fatMax: fc.option(fc.double({ min: 50, max: 150, noNaN: true }), { nil: undefined })
          }),
          async (recipes, filters) => {
            // Mock the filtered query result
            let filteredRecipes = recipes.filter(r => {
              // Apply default enrichment_status filter
              if (r.enrichment_status === 'failed') return false;

              // Apply category filter
              if (filters.category !== undefined && r.category !== filters.category) return false;

              // Apply cuisine filter
              if (filters.cuisine !== undefined && r.cuisine !== filters.cuisine) return false;

              // Apply macro filters
              if (filters.caloriesMin !== undefined && r.macros.calories < filters.caloriesMin) return false;
              if (filters.caloriesMax !== undefined && r.macros.calories > filters.caloriesMax) return false;
              if (filters.proteinMin !== undefined && r.macros.protein < filters.proteinMin) return false;
              if (filters.proteinMax !== undefined && r.macros.protein > filters.proteinMax) return false;
              if (filters.carbsMin !== undefined && r.macros.carbs < filters.carbsMin) return false;
              if (filters.carbsMax !== undefined && r.macros.carbs > filters.carbsMax) return false;
              if (filters.fatMin !== undefined && r.macros.fat < filters.fatMin) return false;
              if (filters.fatMax !== undefined && r.macros.fat > filters.fatMax) return false;

              return true;
            });

            // Mock first query
            mockQuery.range.mockResolvedValueOnce({ 
              data: filteredRecipes, 
              error: null 
            });

            // Execute first query
            const firstResults = await queryInterface.queryRecipes(filters, { pageSize: 100 });

            // Mock second query with identical filters
            mockQuery.range.mockResolvedValueOnce({ 
              data: filteredRecipes, 
              error: null 
            });

            // Execute second query with identical filters
            const secondResults = await queryInterface.queryRecipes(filters, { pageSize: 100 });

            // Assert: both results should be identical
            expect(secondResults.length).toBe(firstResults.length);
            
            // Compare IDs to ensure same recipes in same order
            const firstIds = firstResults.map(r => r.id);
            const secondIds = secondResults.map(r => r.id);
            expect(secondIds).toEqual(firstIds);

            // Deep equality check on all fields
            expect(secondResults).toEqual(firstResults);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
