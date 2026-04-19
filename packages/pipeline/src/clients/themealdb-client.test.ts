/**
 * Unit tests for TheMealDBClient
 */

import { TheMealDBClient } from './themealdb-client';
import { TheMealDBRecipe } from '../types/domain';

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('TheMealDBClient', () => {
  let client: TheMealDBClient;

  beforeEach(() => {
    client = new TheMealDBClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('fetchRecipeById', () => {
    it('should fetch a recipe by ID successfully', async () => {
      const mockRecipe: TheMealDBRecipe = {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F...',
        strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
        strIngredient1: 'soy sauce',
        strMeasure1: '3/4 cup',
        strIngredient2: 'water',
        strMeasure2: '1/2 cup',
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
        strMeasure20: '',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ meals: [mockRecipe] }),
      });

      const result = await client.fetchRecipeById('52772');

      expect(result).toEqual(mockRecipe);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.themealdb.com/api/json/v1/1/lookup.php?i=52772'
      );
    });

    it('should return null when recipe is not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ meals: null }),
      });

      const result = await client.fetchRecipeById('99999');

      expect(result).toBeNull();
    });

    it('should return null and log error on fetch failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.fetchRecipeById('52772');

      expect(result).toBeNull();
    });

    it('should handle HTTP 404 errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ meals: null }),
      });

      const result = await client.fetchRecipeById('99999');

      expect(result).toBeNull();
    });
  });

  describe('fetchRecipes', () => {
    it('should fetch multiple recipes successfully', async () => {
      const mockRecipe1: TheMealDBRecipe = {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F...',
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
        strMeasure20: '',
      };

      const mockRecipe2: TheMealDBRecipe = {
        ...mockRecipe1,
        idMeal: '52773',
        strMeal: 'Spaghetti Bolognese',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe1] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe2] }),
        });

      const result = await client.fetchRecipes(2);

      expect(result).toHaveLength(2);
      expect(result[0].idMeal).toBe('52772');
      expect(result[1].idMeal).toBe('52773');
    });

    it('should deduplicate recipes with the same ID', async () => {
      const mockRecipe: TheMealDBRecipe = {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F...',
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
        strMeasure20: '',
      };

      // Return the same recipe twice
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [{ ...mockRecipe, idMeal: '52773' }] }),
        });

      const result = await client.fetchRecipes(2);

      expect(result).toHaveLength(2);
      expect(result[0].idMeal).toBe('52772');
      expect(result[1].idMeal).toBe('52773');
    });

    it('should handle partial failures gracefully', async () => {
      const mockRecipe: TheMealDBRecipe = {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F...',
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
        strMeasure20: '',
      };

      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe] }),
        });

      const result = await client.fetchRecipes(1);

      expect(result).toHaveLength(1);
      expect(result[0].idMeal).toBe('52772');
    });
  });

  describe('retry logic', () => {
    it('should retry on 429 rate limit with exponential backoff', async () => {
      const mockRecipe: TheMealDBRecipe = {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F...',
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
        strMeasure20: '',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe] }),
        });

      const result = await client.fetchRecipeById('52772');

      expect(result).toEqual(mockRecipe);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx server errors', async () => {
      const mockRecipe: TheMealDBRecipe = {
        idMeal: '52772',
        strMeal: 'Teriyaki Chicken Casserole',
        strCategory: 'Chicken',
        strArea: 'Japanese',
        strInstructions: 'Preheat oven to 350° F...',
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
        strMeasure20: '',
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ meals: [mockRecipe] }),
        });

      const result = await client.fetchRecipeById('52772');

      expect(result).toEqual(mockRecipe);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx client errors (except 429)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await client.fetchRecipeById('99999');

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const result = await client.fetchRecipeById('52772');

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(3); // maxRetries = 3
    }, 10000); // Increase timeout to 10 seconds for exponential backoff
  });
});
