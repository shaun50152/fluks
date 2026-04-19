/**
 * Integration Tests for Recipe Ingestion Pipeline
 * 
 * Task 5.4: Write integration test for end-to-end happy path
 * Task 5.5: Write integration test for partial enrichment
 * Task 5.6: Write integration test for complete enrichment failure
 * 
 * These tests validate the complete pipeline flow:
 * 1. Fetch recipes from TheMealDB (mocked)
 * 2. Parse ingredients
 * 3. Match ingredients with USDA (mocked)
 * 4. Aggregate macros
 * 5. Normalize recipe
 * 6. Store in Supabase (mocked)
 * 
 * Test Cases:
 * - End-to-end happy path with complete enrichment
 * - Partial enrichment with some unmatched ingredients
 * - Complete enrichment failure with no matched ingredients
 */

import nock from 'nock';
import { runIngestionJob } from '../index';
import { PipelineConfig } from '../config/validator';
import { SupabaseStorageClient } from '../storage/supabase-client';

// Mock p-limit to avoid ESM issues in Jest
jest.mock('p-limit', () => {
  return jest.fn(() => (fn: () => any) => fn());
});

// Mock Supabase client
jest.mock('../storage/supabase-client');

describe('Integration Tests: Recipe Ingestion Pipeline', () => {
  let mockConfig: PipelineConfig;
  let capturedRecipe: any;

  beforeAll(() => {
    // Disable real HTTP requests
    nock.disableNetConnect();
  });

  afterAll(() => {
    // Re-enable real HTTP requests
    nock.enableNetConnect();
  });

  beforeEach(() => {
    // Clear all HTTP mocks
    nock.cleanAll();
    
    // Reset captured recipe
    capturedRecipe = null;

    // Create mock configuration
    mockConfig = {
      usdaApiKey: 'test-usda-key',
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-service-key',
      recipeFetchLimit: 1,
      recipeBatchSize: 1,
      refreshMode: false,
      stalenessThresholdDays: 90,
      usdaConcurrencyLimit: 5,
      logLevel: 'error' // Reduce test output
    };

    // Mock Supabase client methods
    const mockGetExistingSourceIds = jest.fn().mockResolvedValue(new Set<string>());
    const mockUpsertRecipe = jest.fn().mockImplementation((recipe) => {
      capturedRecipe = recipe;
      return Promise.resolve();
    });

    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.getExistingSourceIds = mockGetExistingSourceIds;
    (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.upsertRecipe = mockUpsertRecipe;
  });

  afterEach(() => {
    // Verify all HTTP mocks were called
    if (!nock.isDone()) {
      console.error('Pending mocks:', nock.pendingMocks());
    }
  });

  it('should successfully process a recipe through the complete pipeline with enrichment_status: complete', async () => {
    // Mock TheMealDB API response (using random.php endpoint)
    nock('https://www.themealdb.com')
      .get('/api/json/v1/1/random.php')
      .reply(200, {
        meals: [
          {
            idMeal: '52772',
            strMeal: 'Teriyaki Chicken Casserole',
            strCategory: 'Chicken',
            strArea: 'Japanese',
            strInstructions: 'Preheat oven to 350° F. Spray a 9x13-inch baking pan with non-stick spray.\nCombine soy sauce, ½ cup water, brown sugar, ginger and garlic in a small saucepan and cover. Bring to a boil over medium heat. Cook for one minute once boiling.\nMeanwhile, stir together the corn starch and 2 tablespoons of water in a separate dish until smooth. Once sauce is boiling, add mixture to the saucepan and stir to combine. Cook until the sauce starts to thicken then remove from heat.\nPlace the chicken breasts in the prepared pan. Pour one cup of the sauce over top of chicken. Place chicken in oven and bake 35 minutes or until cooked through. Remove from oven and shred chicken in the dish using two forks.\n*Meanwhile, steam or cook the vegetables according to package directions.\nAdd the cooked vegetables and rice to the casserole dish with the chicken. Add most of the remaining sauce, reserving a bit to drizzle over the top when serving. Gently toss everything together in the casserole dish until combined. Return to oven and cook 15 minutes. Remove from oven and let stand 5 minutes before serving. Drizzle each serving with remaining sauce. Enjoy!',
            strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
            strIngredient1: 'soy sauce',
            strMeasure1: '3/4 cup',
            strIngredient2: 'water',
            strMeasure2: '1/2 cup',
            strIngredient3: 'brown sugar',
            strMeasure3: '1/4 cup',
            strIngredient4: 'ground ginger',
            strMeasure4: '1/2 teaspoon',
            strIngredient5: 'minced garlic',
            strMeasure5: '1/2 teaspoon',
            strIngredient6: 'cornstarch',
            strMeasure6: '4 Tablespoons',
            strIngredient7: 'chicken breasts',
            strMeasure7: '2',
            strIngredient8: 'stir-fry vegetables',
            strMeasure8: '1 (12 oz.)',
            strIngredient9: 'brown rice',
            strMeasure9: '3 cups',
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
        ]
      });

    // Mock USDA API responses for each ingredient
    // 1. soy sauce
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'soy sauce', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123456,
            description: 'Soy sauce',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 53 },
              { nutrientId: 1003, nutrientNumber: '203', value: 5.6 },
              { nutrientId: 1005, nutrientNumber: '205', value: 4.9 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0.1 }
            ]
          }
        ]
      });

    // 2. water
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'water', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123457,
            description: 'Water',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 0 },
              { nutrientId: 1003, nutrientNumber: '203', value: 0 },
              { nutrientId: 1005, nutrientNumber: '205', value: 0 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0 }
            ]
          }
        ]
      });

    // 3. brown sugar
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'brown sugar', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123458,
            description: 'Brown sugar',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 380 },
              { nutrientId: 1003, nutrientNumber: '203', value: 0.1 },
              { nutrientId: 1005, nutrientNumber: '205', value: 98.1 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0 }
            ]
          }
        ]
      });

    // 4. ground ginger
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'ginger', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123459,
            description: 'Ginger, ground',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 335 },
              { nutrientId: 1003, nutrientNumber: '203', value: 9 },
              { nutrientId: 1005, nutrientNumber: '205', value: 71.6 },
              { nutrientId: 1004, nutrientNumber: '204', value: 4.2 }
            ]
          }
        ]
      });

    // 5. minced garlic
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'garlic', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123460,
            description: 'Garlic, raw',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 149 },
              { nutrientId: 1003, nutrientNumber: '203', value: 6.4 },
              { nutrientId: 1005, nutrientNumber: '205', value: 33.1 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0.5 }
            ]
          }
        ]
      });

    // 6. cornstarch
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'cornstarch', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123461,
            description: 'Cornstarch',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 381 },
              { nutrientId: 1003, nutrientNumber: '203', value: 0.3 },
              { nutrientId: 1005, nutrientNumber: '205', value: 91.3 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0.1 }
            ]
          }
        ]
      });

    // 7. chicken breasts
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'chicken breasts', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123462,
            description: 'Chicken, broilers or fryers, breast, meat only, raw',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 120 },
              { nutrientId: 1003, nutrientNumber: '203', value: 22.5 },
              { nutrientId: 1005, nutrientNumber: '205', value: 0 },
              { nutrientId: 1004, nutrientNumber: '204', value: 2.6 }
            ]
          }
        ]
      });

    // 8. stir-fry vegetables
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'stir-fry vegetables', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123463,
            description: 'Vegetables, mixed, frozen',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 65 },
              { nutrientId: 1003, nutrientNumber: '203', value: 2.6 },
              { nutrientId: 1005, nutrientNumber: '205', value: 13.2 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0.3 }
            ]
          }
        ]
      });

    // 9. brown rice
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'brown rice', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123464,
            description: 'Rice, brown, long-grain, cooked',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 112 },
              { nutrientId: 1003, nutrientNumber: '203', value: 2.6 },
              { nutrientId: 1005, nutrientNumber: '205', value: 23.5 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0.9 }
            ]
          }
        ]
      });

    // Run the ingestion job
    const summary = await runIngestionJob(mockConfig);

    // Verify job summary
    expect(summary.totalFetched).toBe(1);
    expect(summary.totalSkipped).toBe(0);
    expect(summary.totalEnriched).toBe(1);
    expect(summary.totalPartial).toBe(0);
    expect(summary.totalFailed).toBe(0);
    expect(summary.errors).toHaveLength(0);

    // Verify recipe was captured and stored
    expect(capturedRecipe).toBeDefined();
    expect(capturedRecipe).not.toBeNull();

    // Verify recipe structure (Requirement 1.1, 1.2)
    expect(capturedRecipe.source).toBe('themealdb');
    expect(capturedRecipe.sourceRecipeId).toBe('52772');
    expect(capturedRecipe.title).toBe('Teriyaki Chicken Casserole');
    expect(capturedRecipe.category).toBe('Chicken');
    expect(capturedRecipe.cuisine).toBe('Japanese');
    expect(capturedRecipe.imageUrl).toBe('https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg');
    expect(capturedRecipe.instructions).toContain('Preheat oven to 350° F');

    // Verify ingredients were parsed (Requirement 2.1)
    expect(capturedRecipe.ingredients).toBeDefined();
    expect(capturedRecipe.ingredients.length).toBeGreaterThan(0);
    expect(capturedRecipe.ingredients[0]).toHaveProperty('name');
    expect(capturedRecipe.ingredients[0]).toHaveProperty('amount');
    expect(capturedRecipe.ingredients[0]).toHaveProperty('unit');
    expect(capturedRecipe.ingredients[0]).toHaveProperty('rawText');

    // Verify macros were aggregated (Requirement 3.1, 4.1)
    expect(capturedRecipe.macros).toBeDefined();
    expect(capturedRecipe.macros.calories).toBeGreaterThan(0);
    expect(capturedRecipe.macros.protein).toBeGreaterThan(0);
    expect(capturedRecipe.macros.carbs).toBeGreaterThan(0);
    expect(capturedRecipe.macros.fat).toBeGreaterThan(0);

    // Verify enrichment status is 'complete' (Requirement 5.1)
    expect(capturedRecipe.enrichmentStatus).toBe('complete');
    expect(capturedRecipe.unmatchedIngredients).toHaveLength(0);

    // Verify recipe normalization (Requirement 5.1)
    expect(capturedRecipe.id).toBeDefined();
    expect(capturedRecipe.authorId).toBeNull();
    expect(capturedRecipe.createdAt).toBeDefined();
    expect(capturedRecipe.updatedAt).toBeDefined();
    expect(capturedRecipe.tags).toContain('Chicken');
    expect(capturedRecipe.tags).toContain('Japanese');
    expect(capturedRecipe.steps).toBeDefined();
    expect(capturedRecipe.steps.length).toBeGreaterThan(0);

    // Verify idempotent storage (Requirement 6.1)
    const mockUpsertRecipe = (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.upsertRecipe;
    expect(mockUpsertRecipe).toHaveBeenCalledTimes(1);
    expect(mockUpsertRecipe).toHaveBeenCalledWith(capturedRecipe);

    // Verify all HTTP mocks were called
    expect(nock.isDone()).toBe(true);
  });

  it('should handle partial enrichment when some ingredients have no USDA matches', async () => {
    // Mock TheMealDB API response with a recipe containing some unmatchable ingredients
    nock('https://www.themealdb.com')
      .get('/api/json/v1/1/random.php')
      .reply(200, {
        meals: [
          {
            idMeal: '52773',
            strMeal: 'Exotic Fusion Bowl',
            strCategory: 'Vegetarian',
            strArea: 'Asian',
            strInstructions: 'Cook the quinoa according to package directions. Prepare the dragon fruit and arrange in a bowl. Add the cooked quinoa and drizzle with yuzu sauce. Garnish with microgreens and serve.',
            strMealThumb: 'https://www.themealdb.com/images/media/meals/example.jpg',
            strIngredient1: 'quinoa',
            strMeasure1: '1 cup',
            strIngredient2: 'dragon fruit',
            strMeasure2: '1 whole',
            strIngredient3: 'yuzu sauce',
            strMeasure3: '2 tablespoons',
            strIngredient4: 'microgreens',
            strMeasure4: '1/4 cup',
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
        ]
      });

    // Mock USDA API responses
    // 1. quinoa - SUCCESSFUL MATCH
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'quinoa', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123465,
            description: 'Quinoa, cooked',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 120 },
              { nutrientId: 1003, nutrientNumber: '203', value: 4.4 },
              { nutrientId: 1005, nutrientNumber: '205', value: 21.3 },
              { nutrientId: 1004, nutrientNumber: '204', value: 1.9 }
            ]
          }
        ]
      });

    // 2. dragon fruit - NO MATCH (empty foods array)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'dragon fruit', pageSize: '1' })
      .reply(200, {
        foods: []
      });

    // 3. yuzu sauce - NO MATCH (empty foods array)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'yuzu sauce', pageSize: '1' })
      .reply(200, {
        foods: []
      });

    // 4. microgreens - SUCCESSFUL MATCH
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'microgreens', pageSize: '1' })
      .reply(200, {
        foods: [
          {
            fdcId: 123466,
            description: 'Microgreens',
            foodNutrients: [
              { nutrientId: 1008, nutrientNumber: '208', value: 29 },
              { nutrientId: 1003, nutrientNumber: '203', value: 2.6 },
              { nutrientId: 1005, nutrientNumber: '205', value: 3.9 },
              { nutrientId: 1004, nutrientNumber: '204', value: 0.5 }
            ]
          }
        ]
      });

    // Run the ingestion job
    const summary = await runIngestionJob(mockConfig);

    // Verify job summary (Requirement 14.1, 14.2)
    expect(summary.totalFetched).toBe(1);
    expect(summary.totalSkipped).toBe(0);
    expect(summary.totalEnriched).toBe(0); // Not fully enriched
    expect(summary.totalPartial).toBe(1); // Partially enriched
    expect(summary.totalFailed).toBe(0);

    // Verify recipe was captured and stored
    expect(capturedRecipe).toBeDefined();
    expect(capturedRecipe).not.toBeNull();

    // Verify recipe basic structure (Requirement 3.3)
    expect(capturedRecipe.source).toBe('themealdb');
    expect(capturedRecipe.sourceRecipeId).toBe('52773');
    expect(capturedRecipe.title).toBe('Exotic Fusion Bowl');
    expect(capturedRecipe.category).toBe('Vegetarian');
    expect(capturedRecipe.cuisine).toBe('Asian');

    // Verify enrichment status is 'partial' (Requirement 4.2, 5.5, 14.1)
    expect(capturedRecipe.enrichmentStatus).toBe('partial');

    // Verify unmatchedIngredients array is populated (Requirement 14.2, 14.5)
    expect(capturedRecipe.unmatchedIngredients).toBeDefined();
    expect(capturedRecipe.unmatchedIngredients).toHaveLength(2);
    expect(capturedRecipe.unmatchedIngredients).toContain('dragon fruit');
    expect(capturedRecipe.unmatchedIngredients).toContain('yuzu sauce');

    // Verify macros are present but only include matched ingredients (Requirement 14.1)
    expect(capturedRecipe.macros).toBeDefined();
    expect(capturedRecipe.macros.calories).toBeGreaterThan(0);
    expect(capturedRecipe.macros.protein).toBeGreaterThan(0);
    expect(capturedRecipe.macros.carbs).toBeGreaterThan(0);
    expect(capturedRecipe.macros.fat).toBeGreaterThan(0);

    // Verify all ingredients are present in the recipe
    expect(capturedRecipe.ingredients).toBeDefined();
    expect(capturedRecipe.ingredients.length).toBe(4);

    // Verify the recipe was stored via upsert
    const mockUpsertRecipe = (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.upsertRecipe;
    expect(mockUpsertRecipe).toHaveBeenCalledTimes(1);
    expect(mockUpsertRecipe).toHaveBeenCalledWith(capturedRecipe);

    // Verify all HTTP mocks were called
    expect(nock.isDone()).toBe(true);
  });

  it('should handle complete enrichment failure when no ingredients have USDA matches', async () => {
    // Mock TheMealDB API response with a recipe containing unmatchable ingredients
    nock('https://www.themealdb.com')
      .get('/api/json/v1/1/random.php')
      .reply(200, {
        meals: [
          {
            idMeal: '52774',
            strMeal: 'Mystical Elixir Bowl',
            strCategory: 'Exotic',
            strArea: 'Fantasy',
            strInstructions: 'Combine all mystical ingredients in a ceremonial bowl. Stir clockwise three times while chanting. Let rest for 10 minutes before serving.',
            strMealThumb: 'https://www.themealdb.com/images/media/meals/mystical.jpg',
            strIngredient1: 'unicorn tears',
            strMeasure1: '3 drops',
            strIngredient2: 'phoenix feather',
            strMeasure2: '1 whole',
            strIngredient3: 'dragon scale powder',
            strMeasure3: '1 pinch',
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
          }
        ]
      });

    // Mock USDA API responses - ALL return empty results (no matches)
    // The matcher tries exact match first, then fallback with simplified query
    
    // 1. drops unicorn tears - NO MATCH (exact)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'drops unicorn tears', pageSize: '1' })
      .reply(200, {
        foods: []
      });
    // 1b. drops - NO MATCH (fallback)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'drops', pageSize: '1' })
      .reply(200, {
        foods: []
      });

    // 2. phoenix feather - NO MATCH (exact)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'phoenix feather', pageSize: '1' })
      .reply(200, {
        foods: []
      });
    // 2b. phoenix - NO MATCH (fallback)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'phoenix', pageSize: '1' })
      .reply(200, {
        foods: []
      });

    // 3. dragon scale powder - NO MATCH (exact)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'dragon scale powder', pageSize: '1' })
      .reply(200, {
        foods: []
      });
    // 3b. dragon - NO MATCH (fallback)
    nock('https://api.nal.usda.gov')
      .get('/fdc/v1/foods/search')
      .query({ api_key: 'test-usda-key', query: 'dragon', pageSize: '1' })
      .reply(200, {
        foods: []
      });

    // Run the ingestion job
    const summary = await runIngestionJob(mockConfig);

    // Verify job summary (Requirement 14.2)
    expect(summary.totalFetched).toBe(1);
    expect(summary.totalSkipped).toBe(0);
    expect(summary.totalEnriched).toBe(0); // Not enriched
    expect(summary.totalPartial).toBe(0); // Not partial
    expect(summary.totalFailed).toBe(1); // Complete failure

    // Verify recipe was captured and stored
    expect(capturedRecipe).toBeDefined();
    expect(capturedRecipe).not.toBeNull();

    // Verify recipe basic structure (Requirement 3.3)
    expect(capturedRecipe.source).toBe('themealdb');
    expect(capturedRecipe.sourceRecipeId).toBe('52774');
    expect(capturedRecipe.title).toBe('Mystical Elixir Bowl');
    expect(capturedRecipe.category).toBe('Exotic');
    expect(capturedRecipe.cuisine).toBe('Fantasy');

    // Verify enrichment status is 'failed' (Requirement 5.6, 14.2)
    expect(capturedRecipe.enrichmentStatus).toBe('failed');

    // Verify unmatchedIngredients array contains all ingredients (Requirement 14.4)
    expect(capturedRecipe.unmatchedIngredients).toBeDefined();
    expect(capturedRecipe.unmatchedIngredients).toHaveLength(3);
    expect(capturedRecipe.unmatchedIngredients).toContain('drops unicorn tears');
    expect(capturedRecipe.unmatchedIngredients).toContain('phoenix feather');
    expect(capturedRecipe.unmatchedIngredients).toContain('dragon scale powder');

    // Verify macros are null or zero (Requirement 14.2)
    expect(capturedRecipe.macros).toBeDefined();
    if (capturedRecipe.macros !== null) {
      expect(capturedRecipe.macros.calories).toBe(0);
      expect(capturedRecipe.macros.protein).toBe(0);
      expect(capturedRecipe.macros.carbs).toBe(0);
      expect(capturedRecipe.macros.fat).toBe(0);
    }

    // Verify all ingredients are present in the recipe
    expect(capturedRecipe.ingredients).toBeDefined();
    expect(capturedRecipe.ingredients.length).toBe(3);

    // Verify the recipe was stored via upsert
    const mockUpsertRecipe = (SupabaseStorageClient as jest.MockedClass<typeof SupabaseStorageClient>).prototype.upsertRecipe;
    expect(mockUpsertRecipe).toHaveBeenCalledTimes(1);
    expect(mockUpsertRecipe).toHaveBeenCalledWith(capturedRecipe);

    // Verify all HTTP mocks were called
    expect(nock.isDone()).toBe(true);
  });
});
