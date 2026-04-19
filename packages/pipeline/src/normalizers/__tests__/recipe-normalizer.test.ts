import { RecipeNormalizer } from '../recipe-normalizer';
import { TheMealDBRecipe, RecipeMacros, EnrichmentStatus } from '../../types/domain';

describe('RecipeNormalizer', () => {
  const normalizer = new RecipeNormalizer();

  const createMockTheMealDBRecipe = (): TheMealDBRecipe => ({
    idMeal: '52772',
    strMeal: 'Teriyaki Chicken Casserole',
    strCategory: 'Chicken',
    strArea: 'Japanese',
    strInstructions: 'Preheat oven to 350° F. Spray a 9x13-inch baking pan with non-stick spray.\nCombine soy sauce, ½ cup water, brown sugar, ginger and garlic in a small saucepan and cover. Bring to a boil over medium heat. Remove lid and cook for one minute once boiling.\nMeanwhile, stir together the corn starch and 2 tablespoons of water in a separate dish until smooth. Once sauce is boiling, add mixture to the saucepan and stir to combine. Cook until the sauce starts to thicken then remove from heat.\nPlace the chicken breasts in the prepared pan. Pour one cup of the sauce over top of chicken. Place chicken in oven and bake 35 minutes or until cooked through. Remove from oven and shred chicken in the pan using two forks.\n*Meanwhile, steam or cook the vegetables according to package directions.\nAdd the cooked vegetables and rice to the casserole dish with the chicken. Add most of the remaining sauce, reserving a bit to drizzle over the top when serving. Gently toss everything together in the casserole dish until combined. Return to oven and cook 15 minutes. Remove from oven and let stand 5 minutes before serving. Drizzle each serving with remaining sauce. Enjoy!',
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
  });

  const createMockMacros = (): RecipeMacros => ({
    total: {
      calories: 450.5,
      proteinG: 35.2,
      carbsG: 52.8,
      fatG: 8.3
    },
    perServing: null,
    matchedIngredientCount: 7,
    totalIngredientCount: 9
  });

  describe('normalize() - basic functionality', () => {
    it('should normalize a complete TheMealDB recipe', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();
      const unmatchedIngredients = ['stir-fry vegetables', 'brown rice'];
      const enrichmentStatus: EnrichmentStatus = 'partial';

      const result = normalizer.normalize(tmdbRecipe, macros, unmatchedIngredients, enrichmentStatus);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.source).toBe('themealdb');
      expect(result.sourceRecipeId).toBe('52772');
      expect(result.title).toBe('Teriyaki Chicken Casserole');
      expect(result.description).toBeNull();
      expect(result.imageUrl).toBe('https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg');
      expect(result.category).toBe('Chicken');
      expect(result.cuisine).toBe('Japanese');
      expect(result.instructions).toBe(tmdbRecipe.strInstructions);
      expect(result.servings).toBeNull();
      expect(result.cookTime).toBe(0);
      expect(result.authorId).toBeNull();
      expect(result.enrichmentStatus).toBe('partial');
      expect(result.unmatchedIngredients).toEqual(['stir-fry vegetables', 'brown rice']);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.createdAt).toBe(result.updatedAt);
    });

    it('should set enrichment status to complete when all ingredients matched', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();
      const unmatchedIngredients: string[] = [];
      const enrichmentStatus: EnrichmentStatus = 'complete';

      const result = normalizer.normalize(tmdbRecipe, macros, unmatchedIngredients, enrichmentStatus);

      expect(result.enrichmentStatus).toBe('complete');
      expect(result.unmatchedIngredients).toEqual([]);
    });

    it('should set enrichment status to failed when enrichment fails', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();
      const unmatchedIngredients = ['all', 'ingredients', 'failed'];
      const enrichmentStatus: EnrichmentStatus = 'failed';

      const result = normalizer.normalize(tmdbRecipe, macros, unmatchedIngredients, enrichmentStatus);

      expect(result.enrichmentStatus).toBe('failed');
      expect(result.unmatchedIngredients).toEqual(['all', 'ingredients', 'failed']);
    });
  });

  describe('extractIngredients()', () => {
    it('should extract all non-empty ingredients', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.ingredients).toHaveLength(9);
      expect(result.ingredients[0]).toEqual({
        name: 'soy sauce',
        amount: null,
        unit: null,
        rawText: '3/4 cup soy sauce'
      });
      expect(result.ingredients[1]).toEqual({
        name: 'water',
        amount: null,
        unit: null,
        rawText: '1/2 cup water'
      });
    });

    it('should skip empty ingredient slots', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        idMeal: '12345',
        strMeal: 'Test Recipe',
        strCategory: 'Dessert',
        strArea: 'American',
        strInstructions: 'Mix and bake',
        strMealThumb: 'https://example.com/image.jpg',
        strIngredient1: 'flour',
        strMeasure1: '2 cups',
        strIngredient2: '',
        strMeasure2: '',
        strIngredient3: 'sugar',
        strMeasure3: '1 cup',
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
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0].name).toBe('flour');
      expect(result.ingredients[1].name).toBe('sugar');
    });

    it('should handle ingredients without measures', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        idMeal: '12345',
        strMeal: 'Test Recipe',
        strCategory: 'Dessert',
        strArea: 'American',
        strInstructions: 'Mix and bake',
        strMealThumb: 'https://example.com/image.jpg',
        strIngredient1: 'salt',
        strMeasure1: '',
        strIngredient2: 'pepper',
        strMeasure2: '   ',
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
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.ingredients[0]).toEqual({
        name: 'salt',
        amount: null,
        unit: null,
        rawText: 'salt'
      });
      expect(result.ingredients[1]).toEqual({
        name: 'pepper',
        amount: null,
        unit: null,
        rawText: 'pepper'
      });
    });
  });

  describe('splitInstructions()', () => {
    it('should split instructions by newlines', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps.length).toBeGreaterThan(1);
      expect(result.steps[0].order).toBe(1);
      expect(result.steps[0].instruction).toContain('Preheat oven');
      expect(result.steps[1].order).toBe(2);
    });

    it('should handle instructions with numbered steps', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strInstructions: '1. Preheat oven to 350°F.\n2. Mix ingredients.\n3. Bake for 30 minutes.'
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].instruction).toBe('Preheat oven to 350°F.');
      expect(result.steps[1].instruction).toBe('Mix ingredients.');
      expect(result.steps[2].instruction).toBe('Bake for 30 minutes.');
    });

    it('should handle instructions with "Step N:" format', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strInstructions: 'Step 1: Preheat oven.\nStep 2: Mix ingredients.\nStep 3: Bake.'
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].instruction).toBe('Preheat oven.');
      expect(result.steps[1].instruction).toBe('Mix ingredients.');
      expect(result.steps[2].instruction).toBe('Bake.');
    });

    it('should split by sentences when no newlines present', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strInstructions: 'Preheat oven to 350°F. Mix all ingredients in a bowl. Bake for 30 minutes.'
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps.length).toBe(3);
      expect(result.steps[0].instruction).toBe('Preheat oven to 350°F.');
      expect(result.steps[1].instruction).toBe('Mix all ingredients in a bowl.');
      expect(result.steps[2].instruction).toBe('Bake for 30 minutes.');
    });

    it('should handle single-line instructions as one step', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strInstructions: 'Mix everything together and bake'
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].order).toBe(1);
      expect(result.steps[0].instruction).toBe('Mix everything together and bake');
    });

    it('should handle empty instructions', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strInstructions: ''
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps).toHaveLength(0);
    });
  });

  describe('buildTags()', () => {
    it('should include category and cuisine in tags', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.tags).toContain('Chicken');
      expect(result.tags).toContain('Japanese');
      expect(result.tags).toHaveLength(2);
    });

    it('should handle missing category', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strCategory: ''
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.tags).toEqual(['Japanese']);
    });

    it('should handle missing cuisine', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strArea: ''
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.tags).toEqual(['Chicken']);
    });

    it('should handle both category and cuisine missing', () => {
      const tmdbRecipe: TheMealDBRecipe = {
        ...createMockTheMealDBRecipe(),
        strCategory: '',
        strArea: ''
      };
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.tags).toEqual([]);
    });
  });

  describe('convertMacros()', () => {
    it('should convert macros correctly', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.macros).toEqual({
        calories: 450.5,
        protein: 35.2,
        carbs: 52.8,
        fat: 8.3
      });
    });

    it('should handle zero macros', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros: RecipeMacros = {
        total: {
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0
        },
        perServing: null,
        matchedIngredientCount: 0,
        totalIngredientCount: 5
      };

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'failed');

      expect(result.macros).toEqual({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      });
    });
  });

  describe('Requirements validation', () => {
    it('should satisfy Requirement 5.1: Transform TheMealDB to FoodOS Recipe', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      // Verify all required FoodOS Recipe fields are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('ingredients');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('macros');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('cookTime');
      expect(result).toHaveProperty('mediaUrl');
      expect(result).toHaveProperty('mediaType');
      expect(result).toHaveProperty('authorId');
      expect(result).toHaveProperty('createdAt');
    });

    it('should satisfy Requirement 5.2: Include all required fields', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, ['ingredient1'], 'partial');

      expect(result.id).toBeDefined();
      expect(result.source).toBe('themealdb');
      expect(result.sourceRecipeId).toBe(tmdbRecipe.idMeal);
      expect(result.title).toBe(tmdbRecipe.strMeal);
      expect(result.imageUrl).toBe(tmdbRecipe.strMealThumb);
      expect(result.category).toBe(tmdbRecipe.strCategory);
      expect(result.cuisine).toBe(tmdbRecipe.strArea);
      expect(result.instructions).toBe(tmdbRecipe.strInstructions);
      expect(result.ingredients).toBeDefined();
      expect(result.servings).toBeNull();
      expect(result.cookTime).toBe(0);
      expect(result.tags).toBeDefined();
      expect(result.macros).toBeDefined();
      expect(result.enrichmentStatus).toBe('partial');
      expect(result.unmatchedIngredients).toEqual(['ingredient1']);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should satisfy Requirement 5.4: Set enrichment_status to complete', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.enrichmentStatus).toBe('complete');
    });

    it('should satisfy Requirement 5.5: Set enrichment_status to partial', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();
      const unmatchedIngredients = ['ingredient1', 'ingredient2'];

      const result = normalizer.normalize(tmdbRecipe, macros, unmatchedIngredients, 'partial');

      expect(result.enrichmentStatus).toBe('partial');
      expect(result.unmatchedIngredients).toEqual(unmatchedIngredients);
    });

    it('should satisfy Requirement 5.6: Set enrichment_status to failed', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();
      const unmatchedIngredients = ['all', 'ingredients'];

      const result = normalizer.normalize(tmdbRecipe, macros, unmatchedIngredients, 'failed');

      expect(result.enrichmentStatus).toBe('failed');
    });

    it('should satisfy Requirement 16.5: Populate steps by splitting instructions', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0]).toHaveProperty('order');
      expect(result.steps[0]).toHaveProperty('instruction');
      expect(result.steps[0].order).toBe(1);
    });

    it('should satisfy Requirement 16.6: Populate tags with category and cuisine', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.tags).toContain(tmdbRecipe.strCategory);
      expect(result.tags).toContain(tmdbRecipe.strArea);
    });

    it('should satisfy Requirement 16.7: Set authorId to null', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result.authorId).toBeNull();
    });

    it('should satisfy Requirement 16.1: Generate UUID for id field', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      // UUID v4 format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(result.id).toMatch(uuidRegex);
    });

    it('should generate unique IDs for different recipes', () => {
      const tmdbRecipe = createMockTheMealDBRecipe();
      const macros = createMockMacros();

      const result1 = normalizer.normalize(tmdbRecipe, macros, [], 'complete');
      const result2 = normalizer.normalize(tmdbRecipe, macros, [], 'complete');

      expect(result1.id).not.toBe(result2.id);
    });
  });
});
