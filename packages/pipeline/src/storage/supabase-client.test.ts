/**
 * Unit tests for SupabaseStorageClient
 * 
 * Tests upsert operations, deduplication, and migration handling.
 */

import { SupabaseStorageClient } from './supabase-client';
import { NormalizedRecipe } from '../types/domain';
import { createClient } from '@supabase/supabase-js';

// Mock the Supabase client
jest.mock('@supabase/supabase-js');

describe('SupabaseStorageClient', () => {
  let mockSupabaseClient: any;
  let client: SupabaseStorageClient;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Supabase client with chainable methods
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis()
    };

    // Mock createClient to return our mock
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    // Create client instance
    client = new SupabaseStorageClient('https://test.supabase.co', 'test-key');
  });

  describe('constructor', () => {
    it('should throw error if URL is missing', () => {
      expect(() => new SupabaseStorageClient('', 'test-key')).toThrow(
        'Supabase URL and service key are required'
      );
    });

    it('should throw error if service key is missing', () => {
      expect(() => new SupabaseStorageClient('https://test.supabase.co', '')).toThrow(
        'Supabase URL and service key are required'
      );
    });

    it('should create Supabase client with correct configuration', () => {
      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
    });
  });

  describe('upsertRecipe', () => {
    const mockRecipe: NormalizedRecipe = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      source: 'themealdb',
      sourceRecipeId: 'meal_123',
      title: 'Test Recipe',
      description: 'A test recipe',
      imageUrl: 'https://example.com/image.jpg',
      mediaUrl: null,
      mediaType: null,
      category: 'Dessert',
      cuisine: 'Italian',
      instructions: 'Mix and bake',
      ingredients: [
        { name: 'flour', amount: 2, unit: 'cups', rawText: '2 cups flour' }
      ],
      steps: [
        { order: 1, instruction: 'Mix ingredients' },
        { order: 2, instruction: 'Bake at 350F' }
      ],
      servings: 4,
      cookTime: 30,
      tags: ['dessert', 'italian'],
      macros: {
        calories: 250,
        protein: 5,
        carbs: 45,
        fat: 8
      },
      enrichmentStatus: 'complete',
      unmatchedIngredients: [],
      authorId: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    it('should successfully upsert a recipe', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });

      await expect(client.upsertRecipe(mockRecipe)).resolves.not.toThrow();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('recipes');
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockRecipe.id,
          source: mockRecipe.source,
          source_recipe_id: mockRecipe.sourceRecipeId,
          title: mockRecipe.title,
          description: mockRecipe.description,
          image_url: mockRecipe.imageUrl,
          media_url: mockRecipe.mediaUrl,
          media_type: mockRecipe.mediaType,
          category: mockRecipe.category,
          cuisine: mockRecipe.cuisine,
          instructions: mockRecipe.instructions,
          ingredients: mockRecipe.ingredients,
          steps: mockRecipe.steps,
          servings: mockRecipe.servings,
          cook_time: mockRecipe.cookTime,
          tags: mockRecipe.tags,
          macros: mockRecipe.macros,
          enrichment_status: mockRecipe.enrichmentStatus,
          unmatched_ingredients: mockRecipe.unmatchedIngredients,
          author_id: mockRecipe.authorId
        }),
        {
          onConflict: 'source_recipe_id',
          ignoreDuplicates: false
        }
      );
    });

    it('should update updated_at timestamp on upsert', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });

      const beforeUpsert = new Date();
      await client.upsertRecipe(mockRecipe);
      const afterUpsert = new Date();

      const upsertCall = mockSupabaseClient.upsert.mock.calls[0][0];
      const updatedAt = new Date(upsertCall.updated_at);

      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpsert.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterUpsert.getTime());
    });

    it('should use onConflict with source_recipe_id', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });

      await client.upsertRecipe(mockRecipe);

      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.any(Object),
        {
          onConflict: 'source_recipe_id',
          ignoreDuplicates: false
        }
      );
    });

    it('should throw error if upsert fails', async () => {
      const mockError = { message: 'Database connection failed' };
      mockSupabaseClient.upsert.mockResolvedValue({ data: null, error: mockError });

      await expect(client.upsertRecipe(mockRecipe)).rejects.toThrow(
        'Failed to upsert recipe meal_123: Database connection failed'
      );
    });

    it('should handle partial enrichment status', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });

      const partialRecipe: NormalizedRecipe = {
        ...mockRecipe,
        enrichmentStatus: 'partial',
        unmatchedIngredients: ['exotic spice', 'rare herb']
      };

      await client.upsertRecipe(partialRecipe);

      const upsertCall = mockSupabaseClient.upsert.mock.calls[0][0];
      expect(upsertCall.enrichment_status).toBe('partial');
      expect(upsertCall.unmatched_ingredients).toEqual(['exotic spice', 'rare herb']);
    });

    it('should handle failed enrichment status', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({ data: {}, error: null });

      const failedRecipe: NormalizedRecipe = {
        ...mockRecipe,
        enrichmentStatus: 'failed',
        macros: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      };

      await client.upsertRecipe(failedRecipe);

      const upsertCall = mockSupabaseClient.upsert.mock.calls[0][0];
      expect(upsertCall.enrichment_status).toBe('failed');
    });
  });

  describe('getExistingSourceIds', () => {
    it('should return set of existing source recipe IDs', async () => {
      const mockData = [
        { source_recipe_id: 'meal_1' },
        { source_recipe_id: 'meal_2' },
        { source_recipe_id: 'meal_3' }
      ];

      mockSupabaseClient.not.mockResolvedValue({ data: mockData, error: null });

      const result = await client.getExistingSourceIds();

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has('meal_1')).toBe(true);
      expect(result.has('meal_2')).toBe(true);
      expect(result.has('meal_3')).toBe(true);
    });

    it('should return empty set if no recipes exist', async () => {
      mockSupabaseClient.not.mockResolvedValue({ data: [], error: null });

      const result = await client.getExistingSourceIds();

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should filter out null source_recipe_id values', async () => {
      const mockData = [
        { source_recipe_id: 'meal_1' },
        { source_recipe_id: null },
        { source_recipe_id: 'meal_2' }
      ];

      mockSupabaseClient.not.mockResolvedValue({ data: mockData, error: null });

      const result = await client.getExistingSourceIds();

      expect(result.size).toBe(2);
      expect(result.has('meal_1')).toBe(true);
      expect(result.has('meal_2')).toBe(true);
    });

    it('should query with correct filters', async () => {
      mockSupabaseClient.not.mockResolvedValue({ data: [], error: null });

      await client.getExistingSourceIds();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('recipes');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('source_recipe_id');
      expect(mockSupabaseClient.not).toHaveBeenCalledWith('source_recipe_id', 'is', null);
    });

    it('should throw error if query fails', async () => {
      const mockError = { message: 'Query timeout' };
      mockSupabaseClient.not.mockResolvedValue({ data: null, error: mockError });

      await expect(client.getExistingSourceIds()).rejects.toThrow(
        'Failed to fetch existing source IDs: Query timeout'
      );
    });

    it('should handle large result sets', async () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        source_recipe_id: `meal_${i}`
      }));

      mockSupabaseClient.not.mockResolvedValue({ data: mockData, error: null });

      const result = await client.getExistingSourceIds();

      expect(result.size).toBe(1000);
    });
  });

  describe('getStaleRecipeIds', () => {
    beforeEach(() => {
      // Add missing chainable methods for stale recipe queries
      mockSupabaseClient.lt = jest.fn().mockReturnThis();
      mockSupabaseClient.or = jest.fn().mockReturnThis();
    });

    it('should return set of stale recipe IDs', async () => {
      const mockData = [
        { source_recipe_id: 'meal_1' },
        { source_recipe_id: 'meal_2' }
      ];

      mockSupabaseClient.or.mockResolvedValue({ data: mockData, error: null });

      const result = await client.getStaleRecipeIds(90);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has('meal_1')).toBe(true);
      expect(result.has('meal_2')).toBe(true);
    });

    it('should return empty set if no stale recipes exist', async () => {
      mockSupabaseClient.or.mockResolvedValue({ data: [], error: null });

      const result = await client.getStaleRecipeIds(90);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should filter out null source_recipe_id values', async () => {
      const mockData = [
        { source_recipe_id: 'meal_1' },
        { source_recipe_id: null },
        { source_recipe_id: 'meal_2' }
      ];

      mockSupabaseClient.or.mockResolvedValue({ data: mockData, error: null });

      const result = await client.getStaleRecipeIds(90);

      expect(result.size).toBe(2);
      expect(result.has('meal_1')).toBe(true);
      expect(result.has('meal_2')).toBe(true);
    });

    it('should query with correct filters for staleness threshold', async () => {
      mockSupabaseClient.or.mockResolvedValue({ data: [], error: null });

      const stalenessThresholdDays = 90;
      await client.getStaleRecipeIds(stalenessThresholdDays);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('recipes');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('source_recipe_id');
      expect(mockSupabaseClient.not).toHaveBeenCalledWith('source_recipe_id', 'is', null);
      expect(mockSupabaseClient.lt).toHaveBeenCalledWith('updated_at', expect.any(String));
      expect(mockSupabaseClient.or).toHaveBeenCalledWith('is_manual.is.null,is_manual.eq.false');
    });

    it('should calculate correct cutoff date', async () => {
      mockSupabaseClient.or.mockResolvedValue({ data: [], error: null });

      const stalenessThresholdDays = 90;
      const beforeCall = new Date();
      beforeCall.setDate(beforeCall.getDate() - stalenessThresholdDays);

      await client.getStaleRecipeIds(stalenessThresholdDays);

      const afterCall = new Date();
      afterCall.setDate(afterCall.getDate() - stalenessThresholdDays);

      const ltCall = mockSupabaseClient.lt.mock.calls[0];
      const cutoffDate = new Date(ltCall[1]);

      // Allow 1 second tolerance for test execution time
      expect(cutoffDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000);
      expect(cutoffDate.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);
    });

    it('should exclude recipes with is_manual: true', async () => {
      mockSupabaseClient.or.mockResolvedValue({ data: [], error: null });

      await client.getStaleRecipeIds(90);

      expect(mockSupabaseClient.or).toHaveBeenCalledWith('is_manual.is.null,is_manual.eq.false');
    });

    it('should throw error if query fails', async () => {
      const mockError = { message: 'Query timeout' };
      mockSupabaseClient.or.mockResolvedValue({ data: null, error: mockError });

      await expect(client.getStaleRecipeIds(90)).rejects.toThrow(
        'Failed to fetch stale recipe IDs: Query timeout'
      );
    });

    it('should handle different staleness thresholds', async () => {
      mockSupabaseClient.or.mockResolvedValue({ data: [], error: null });

      await client.getStaleRecipeIds(30);
      const call30 = mockSupabaseClient.lt.mock.calls[0][1];

      jest.clearAllMocks();
      mockSupabaseClient.lt = jest.fn().mockReturnThis();
      mockSupabaseClient.or = jest.fn().mockResolvedValue({ data: [], error: null });

      await client.getStaleRecipeIds(180);
      const call180 = mockSupabaseClient.lt.mock.calls[0][1];

      const date30 = new Date(call30);
      const date180 = new Date(call180);

      // 180-day threshold should be earlier than 30-day threshold
      expect(date180.getTime()).toBeLessThan(date30.getTime());
    });
  });

  describe('applyMigrations', () => {
    it('should print migration instructions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await client.applyMigrations();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Migration:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('METHOD 1: Supabase Dashboard'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('METHOD 2: Supabase CLI'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('METHOD 3: psql'));

      consoleSpy.mockRestore();
    });

    it('should throw error if migration file not found', async () => {
      // Mock fs to simulate missing file
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      await expect(client.applyMigrations()).rejects.toThrow(
        'Migration file not found'
      );

      jest.restoreAllMocks();
    });
  });
});
