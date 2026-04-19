/**
 * Integration Tests for Job Orchestrator
 * 
 * Tests the main runIngestionJob function with mocked dependencies
 */

import { runIngestionJob } from './index';
import { PipelineConfig } from './config/validator';
import { TheMealDBClient } from './clients/themealdb-client';
import { SupabaseStorageClient } from './storage/supabase-client';

// Mock p-limit to avoid ESM issues in Jest
jest.mock('p-limit', () => {
  return jest.fn(() => (fn: () => any) => fn());
});

// Mock all external dependencies
jest.mock('./clients/themealdb-client');
jest.mock('./storage/supabase-client');

describe('runIngestionJob', () => {
  let mockConfig: PipelineConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock configuration
    mockConfig = {
      usdaApiKey: 'test-usda-key',
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-service-key',
      recipeFetchLimit: 5,
      recipeBatchSize: 2,
      refreshMode: false,
      stalenessThresholdDays: 90,
      usdaConcurrencyLimit: 5,
      logLevel: 'error' // Use error level to reduce test output
    };

    // Mock TheMealDBClient
    const mockFetchRecipes = jest.fn().mockResolvedValue([
      {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F. Spray a 9x13-inch baking pan with non-stick spray.',
        strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
        strIngredient1: 'soy sauce',
        strMeasure1: '3/4 cup',
        strIngredient2: 'water',
        strMeasure2: '1/2 cup',
        strIngredient3: 'brown sugar',
        strMeasure3: '1/4 cup',
        strIngredient4: 'ground ginger',
        strMeasure4: '1/2 teaspoon',
        strIngredient5: '',
        strMeasure5: '',
        strIngredient6: '',
        strMeasure6: '',
        strIngredient7: '',
        strMeasure7: '',
        strIngredient8: '',
        strMeasure8: '',
        strIngredient9: '',
        strMeasure9: '',
        strIngredient10: '',
        strMeasure10: '',
        strIngredient11: '',
        strMeasure11: '',
        strIngredient12: '',
        strMeasure12: '',
        strIngredient13: '',
        strMeasure13: '',
        strIngredient14: '',
        strMeasure14: '',
        strIngredient15: '',
        strMeasure15: '',
        strIngredient16: '',
        strMeasure16: '',
        strIngredient17: '',
        strMeasure17: '',
        strIngredient18: '',
        strMeasure18: '',
        strIngredient19: '',
        strMeasure19: '',
        strIngredient20: '',
        strMeasure20: ''
      }
    ]);

    (TheMealDBClient as jest.MockedClass<typeof TheMealDBClient>).prototype.fetchRecipes = mockFetchRecipes;

    // Mock SupabaseStorageClient
    const mockGetExistingSourceIds = jest.fn().mockResolvedValue(new Set<string>());
    const mockGetStaleRecipeIds = jest.fn().mockResolvedValue(new Set<string>());
    const mockUpsertRecipe = jest.fn().mockResolvedValue(undefined);

    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getExistingSourceIds = mockGetExistingSourceIds;
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getStaleRecipeIds = mockGetStaleRecipeIds;
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.upsertRecipe = mockUpsertRecipe;
  });

  it('should successfully run ingestion job with valid configuration', async () => {
    const summary = await runIngestionJob(mockConfig);

    expect(summary).toBeDefined();
    expect(summary.totalFetched).toBe(1);
    expect(summary.totalSkipped).toBe(0);
    expect(summary.durationMs).toBeGreaterThan(0);
  });

  it('should skip existing recipes when not in refresh mode', async () => {
    // Mock existing recipe
    const mockGetExistingSourceIds = jest.fn().mockResolvedValue(new Set(['52772']));
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getExistingSourceIds = mockGetExistingSourceIds;

    const summary = await runIngestionJob(mockConfig);

    expect(summary.totalFetched).toBe(1);
    expect(summary.totalSkipped).toBe(1);
  });

  it('should query stale recipes in refresh mode', async () => {
    mockConfig.refreshMode = true;
    
    // Mock stale recipe IDs
    const mockGetStaleRecipeIds = jest.fn().mockResolvedValue(new Set(['52772']));
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getStaleRecipeIds = mockGetStaleRecipeIds;

    // Mock fetchRecipeById
    const mockFetchRecipeById = jest.fn().mockResolvedValue({
      idMeal: '52772',
      strMeal: 'Teriyaki Chicken Casserole',
      strCategory: 'Chicken',
      strArea: 'Japanese',
      strInstructions: 'Preheat oven to 350° F.',
      strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
      strIngredient1: 'soy sauce',
      strMeasure1: '3/4 cup',
      strIngredient2: '',
      strMeasure2: '',
      strIngredient3: '',
      strMeasure3: '',
      strIngredient4: '',
      strMeasure4: '',
      strIngredient5: '',
      strMeasure5: '',
      strIngredient6: '',
      strMeasure6: '',
      strIngredient7: '',
      strMeasure7: '',
      strIngredient8: '',
      strMeasure8: '',
      strIngredient9: '',
      strMeasure9: '',
      strIngredient10: '',
      strMeasure10: '',
      strIngredient11: '',
      strMeasure11: '',
      strIngredient12: '',
      strMeasure12: '',
      strIngredient13: '',
      strMeasure13: '',
      strIngredient14: '',
      strMeasure14: '',
      strIngredient15: '',
      strMeasure15: '',
      strIngredient16: '',
      strMeasure16: '',
      strIngredient17: '',
      strMeasure17: '',
      strIngredient18: '',
      strMeasure18: '',
      strIngredient19: '',
      strMeasure19: '',
      strIngredient20: '',
      strMeasure20: ''
    });
    (TheMealDBClient as jest.MockedClass<typeof TheMealDBClient>).prototype.fetchRecipeById = mockFetchRecipeById;

    const summary = await runIngestionJob(mockConfig);

    expect(mockGetStaleRecipeIds).toHaveBeenCalledWith(90);
    expect(mockFetchRecipeById).toHaveBeenCalledWith('52772');
    expect(summary.totalFetched).toBe(1);
  });

  it('should use custom staleness threshold in refresh mode', async () => {
    mockConfig.refreshMode = true;
    mockConfig.stalenessThresholdDays = 30;
    
    const mockGetStaleRecipeIds = jest.fn().mockResolvedValue(new Set<string>());
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getStaleRecipeIds = mockGetStaleRecipeIds;

    await runIngestionJob(mockConfig);

    expect(mockGetStaleRecipeIds).toHaveBeenCalledWith(30);
  });

  it('should complete early if no stale recipes found in refresh mode', async () => {
    mockConfig.refreshMode = true;
    
    const mockGetStaleRecipeIds = jest.fn().mockResolvedValue(new Set<string>());
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getStaleRecipeIds = mockGetStaleRecipeIds;

    const summary = await runIngestionJob(mockConfig);

    expect(summary.totalFetched).toBe(0);
    expect(summary.totalEnriched).toBe(0);
  });

  it('should handle missing recipes in refresh mode', async () => {
    mockConfig.refreshMode = true;
    
    const mockGetStaleRecipeIds = jest.fn().mockResolvedValue(new Set(['52772', '52773']));
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getStaleRecipeIds = mockGetStaleRecipeIds;

    // Mock fetchRecipeById - first returns recipe, second returns null
    const mockFetchRecipeById = jest.fn()
      .mockResolvedValueOnce({
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F.',
        strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
        strIngredient1: 'soy sauce',
        strMeasure1: '3/4 cup',
        strIngredient2: '',
        strMeasure2: '',
        strIngredient3: '',
        strMeasure3: '',
        strIngredient4: '',
        strMeasure4: '',
        strIngredient5: '',
        strMeasure5: '',
        strIngredient6: '',
        strMeasure6: '',
        strIngredient7: '',
        strMeasure7: '',
        strIngredient8: '',
        strMeasure8: '',
        strIngredient9: '',
        strMeasure9: '',
        strIngredient10: '',
        strMeasure10: '',
        strIngredient11: '',
        strMeasure11: '',
        strIngredient12: '',
        strMeasure12: '',
        strIngredient13: '',
        strMeasure13: '',
        strIngredient14: '',
        strMeasure14: '',
        strIngredient15: '',
        strMeasure15: '',
        strIngredient16: '',
        strMeasure16: '',
        strIngredient17: '',
        strMeasure17: '',
        strIngredient18: '',
        strMeasure18: '',
        strIngredient19: '',
        strMeasure19: '',
        strIngredient20: '',
        strMeasure20: ''
      })
      .mockResolvedValueOnce(null); // Recipe not found
    (TheMealDBClient as jest.MockedClass<typeof TheMealDBClient>).prototype.fetchRecipeById = mockFetchRecipeById;

    const summary = await runIngestionJob(mockConfig);

    expect(mockFetchRecipeById).toHaveBeenCalledTimes(2);
    expect(summary.totalFetched).toBe(1); // Only one recipe found
  });

  it('should handle empty recipe list', async () => {
    const mockFetchRecipes = jest.fn().mockResolvedValue([]);
    (TheMealDBClient as jest.MockedClass<typeof TheMealDBClient>).prototype.fetchRecipes = mockFetchRecipes;

    const summary = await runIngestionJob(mockConfig);

    expect(summary.totalFetched).toBe(0);
    expect(summary.totalEnriched).toBe(0);
    expect(summary.totalPartial).toBe(0);
    expect(summary.totalFailed).toBe(0);
  });

  it('should track errors when recipe processing fails', async () => {
    const mockUpsertRecipe = jest.fn().mockRejectedValue(new Error('Database error'));
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.upsertRecipe = mockUpsertRecipe;

    const summary = await runIngestionJob(mockConfig);

    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.totalFailed).toBeGreaterThan(0);
  });

  it('should return summary with correct structure', async () => {
    const summary = await runIngestionJob(mockConfig);

    expect(summary).toHaveProperty('totalFetched');
    expect(summary).toHaveProperty('totalSkipped');
    expect(summary).toHaveProperty('totalEnriched');
    expect(summary).toHaveProperty('totalPartial');
    expect(summary).toHaveProperty('totalFailed');
    expect(summary).toHaveProperty('unmatchedIngredients');
    expect(summary).toHaveProperty('errors');
    expect(summary).toHaveProperty('durationMs');
  });
});
