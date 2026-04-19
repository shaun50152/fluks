/**
 * Unit tests for RecipeQueryInterface
 */

import { RecipeQueryInterface } from './query-interface';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');

describe('RecipeQueryInterface', () => {
  let queryInterface: RecipeQueryInterface;
  let mockClient: any;
  let mockQuery: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock query chain
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    // Create mock client
    mockClient = {
      from: jest.fn().mockReturnValue(mockQuery),
    };

    (createClient as jest.Mock).mockReturnValue(mockClient);

    queryInterface = new RecipeQueryInterface('https://test.supabase.co', 'test-key');
  });

  describe('constructor', () => {
    it('should throw error if URL is missing', () => {
      expect(() => new RecipeQueryInterface('', 'test-key')).toThrow(
        'Supabase URL and service key are required'
      );
    });

    it('should throw error if service key is missing', () => {
      expect(() => new RecipeQueryInterface('https://test.supabase.co', '')).toThrow(
        'Supabase URL and service key are required'
      );
    });

    it('should create client with correct configuration', () => {
      expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-key', {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    });
  });

  describe('queryRecipes', () => {
    it('should return empty array when no results', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      const result = await queryInterface.queryRecipes();

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockQuery.range.mockResolvedValue({ data: null, error: null });

      const result = await queryInterface.queryRecipes();

      expect(result).toEqual([]);
    });

    it('should filter out failed enrichment status by default', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes();

      expect(mockQuery.neq).toHaveBeenCalledWith('enrichment_status', 'failed');
    });

    it('should use default pagination (page 1, size 20)', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes();

      expect(mockQuery.range).toHaveBeenCalledWith(0, 19);
    });

    it('should apply custom pagination', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({}, { page: 2, pageSize: 10 });

      expect(mockQuery.range).toHaveBeenCalledWith(10, 19);
    });

    it('should throw error if page is less than 1', async () => {
      await expect(
        queryInterface.queryRecipes({}, { page: 0 })
      ).rejects.toThrow('Page must be >= 1');
    });

    it('should throw error if page size is less than 1', async () => {
      await expect(
        queryInterface.queryRecipes({}, { pageSize: 0 })
      ).rejects.toThrow('Page size must be between 1 and 100');
    });

    it('should throw error if page size is greater than 100', async () => {
      await expect(
        queryInterface.queryRecipes({}, { pageSize: 101 })
      ).rejects.toThrow('Page size must be between 1 and 100');
    });

    it('should filter by id', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ id: 'recipe-123' });

      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'recipe-123');
    });

    it('should filter by category', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ category: 'Breakfast' });

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'Breakfast');
    });

    it('should filter by cuisine', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ cuisine: 'Italian' });

      expect(mockQuery.eq).toHaveBeenCalledWith('cuisine', 'Italian');
    });

    it('should filter by title search', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ titleSearch: 'pasta' });

      expect(mockQuery.ilike).toHaveBeenCalledWith('title', '%pasta%');
    });

    it('should filter by enrichment status when explicitly provided', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ enrichmentStatus: 'failed' });

      expect(mockQuery.eq).toHaveBeenCalledWith('enrichment_status', 'failed');
      expect(mockQuery.neq).not.toHaveBeenCalled();
    });

    it('should filter by calories min', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ caloriesMin: 200 });

      expect(mockQuery.gte).toHaveBeenCalledWith('macros->calories', 200);
    });

    it('should filter by calories max', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ caloriesMax: 500 });

      expect(mockQuery.lte).toHaveBeenCalledWith('macros->calories', 500);
    });

    it('should filter by protein min', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ proteinMin: 20 });

      expect(mockQuery.gte).toHaveBeenCalledWith('macros->protein', 20);
    });

    it('should filter by protein max', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ proteinMax: 50 });

      expect(mockQuery.lte).toHaveBeenCalledWith('macros->protein', 50);
    });

    it('should filter by carbs min', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ carbsMin: 30 });

      expect(mockQuery.gte).toHaveBeenCalledWith('macros->carbs', 30);
    });

    it('should filter by carbs max', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ carbsMax: 60 });

      expect(mockQuery.lte).toHaveBeenCalledWith('macros->carbs', 60);
    });

    it('should filter by fat min', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ fatMin: 10 });

      expect(mockQuery.gte).toHaveBeenCalledWith('macros->fat', 10);
    });

    it('should filter by fat max', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({ fatMax: 25 });

      expect(mockQuery.lte).toHaveBeenCalledWith('macros->fat', 25);
    });

    it('should apply multiple filters together', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null });

      await queryInterface.queryRecipes({
        category: 'Breakfast',
        cuisine: 'Italian',
        caloriesMin: 200,
        caloriesMax: 500,
        proteinMin: 20
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'Breakfast');
      expect(mockQuery.eq).toHaveBeenCalledWith('cuisine', 'Italian');
      expect(mockQuery.gte).toHaveBeenCalledWith('macros->calories', 200);
      expect(mockQuery.lte).toHaveBeenCalledWith('macros->calories', 500);
      expect(mockQuery.gte).toHaveBeenCalledWith('macros->protein', 20);
    });

    it('should transform database records to Recipe format', async () => {
      const dbRecord = {
        id: 'recipe-123',
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [{ name: 'flour', quantity: 2, unit: 'cups', tags: [] }],
        steps: [{ order: 1, instruction: 'Mix ingredients' }],
        macros: { calories: 300, protein: 10, carbs: 40, fat: 5 },
        tags: ['breakfast', 'quick'],
        cook_time: 30,
        image_url: 'https://example.com/image.jpg',
        media_url: null,
        media_type: null,
        author_id: null,
        created_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.range.mockResolvedValue({ data: [dbRecord], error: null });

      const result = await queryInterface.queryRecipes();

      expect(result).toEqual([
        {
          id: 'recipe-123',
          title: 'Test Recipe',
          description: 'A test recipe',
          ingredients: [{ name: 'flour', quantity: 2, unit: 'cups', tags: [] }],
          steps: [{ order: 1, instruction: 'Mix ingredients' }],
          macros: { calories: 300, protein: 10, carbs: 40, fat: 5 },
          tags: ['breakfast', 'quick'],
          cookTime: 30,
          mediaUrl: 'https://example.com/image.jpg',
          mediaType: 'image',
          authorId: null,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]);
    });

    it('should handle missing optional fields in database records', async () => {
      const dbRecord = {
        id: 'recipe-123',
        title: 'Test Recipe',
        description: null,
        ingredients: null,
        steps: null,
        macros: null,
        tags: null,
        cook_time: null,
        image_url: null,
        media_url: null,
        media_type: null,
        author_id: null,
        created_at: '2024-01-01T00:00:00Z'
      };

      mockQuery.range.mockResolvedValue({ data: [dbRecord], error: null });

      const result = await queryInterface.queryRecipes();

      expect(result).toEqual([
        {
          id: 'recipe-123',
          title: 'Test Recipe',
          description: null,
          ingredients: [],
          steps: [],
          macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          tags: [],
          cookTime: 0,
          mediaUrl: null,
          mediaType: null,
          authorId: null,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ]);
    });

    it('should throw error when query fails', async () => {
      mockQuery.range.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await expect(queryInterface.queryRecipes()).rejects.toThrow(
        'Failed to query recipes: Query failed: Database connection failed'
      );
    });
  });
});
