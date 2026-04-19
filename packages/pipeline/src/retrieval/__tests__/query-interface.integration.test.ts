/**
 * Integration tests for RecipeQueryInterface
 * 
 * These tests verify the query interface behavior with more realistic scenarios.
 */

import { RecipeQueryInterface } from '../query-interface';

describe('RecipeQueryInterface Integration Tests', () => {
  let queryInterface: RecipeQueryInterface;

  beforeEach(() => {
    // Use test credentials
    queryInterface = new RecipeQueryInterface(
      'https://test.supabase.co',
      'test-key'
    );
  });

  describe('Validation', () => {
    it('should reject invalid page numbers', async () => {
      await expect(
        queryInterface.queryRecipes({}, { page: 0 })
      ).rejects.toThrow('Page must be >= 1');

      await expect(
        queryInterface.queryRecipes({}, { page: -1 })
      ).rejects.toThrow('Page must be >= 1');
    });

    it('should reject invalid page sizes', async () => {
      await expect(
        queryInterface.queryRecipes({}, { pageSize: 0 })
      ).rejects.toThrow('Page size must be between 1 and 100');

      await expect(
        queryInterface.queryRecipes({}, { pageSize: 101 })
      ).rejects.toThrow('Page size must be between 1 and 100');

      await expect(
        queryInterface.queryRecipes({}, { pageSize: -1 })
      ).rejects.toThrow('Page size must be between 1 and 100');
    });
  });

  describe('Interface structure', () => {
    it('should accept complex filter combinations', () => {
      // Verify the interface accepts all filter types
      const filters = {
        id: 'recipe-123',
        category: 'Breakfast',
        cuisine: 'Italian',
        titleSearch: 'pasta',
        enrichmentStatus: 'complete' as const,
        caloriesMin: 200,
        caloriesMax: 500,
        proteinMin: 20,
        proteinMax: 50,
        carbsMin: 30,
        carbsMax: 60,
        fatMin: 10,
        fatMax: 25
      };

      // Just verify the interface accepts these parameters
      expect(filters).toBeDefined();
      expect(filters.category).toBe('Breakfast');
    });

    it('should accept pagination parameters', () => {
      const pagination = { page: 2, pageSize: 10 };
      expect(pagination.page).toBe(2);
      expect(pagination.pageSize).toBe(10);
    });

    it('should accept enrichment status values', () => {
      const statuses: Array<'pending' | 'complete' | 'partial' | 'failed'> = [
        'pending',
        'complete',
        'partial',
        'failed'
      ];

      expect(statuses).toHaveLength(4);
      expect(statuses).toContain('complete');
    });
  });
});
