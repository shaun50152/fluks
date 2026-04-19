/**
 * Domain types for the Recipe Ingestion and Enrichment Pipeline
 * 
 * These types define the data structures used throughout the pipeline for:
 * - TheMealDB recipe data
 * - Parsed ingredient structures
 * - USDA nutrition matching
 * - Recipe normalization
 * - Job execution and logging
 */

/**
 * Raw recipe data from TheMealDB API
 */
export interface TheMealDBRecipe {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strIngredient1: string;
  strMeasure1: string;
  strIngredient2: string;
  strMeasure2: string;
  strIngredient3: string;
  strMeasure3: string;
  strIngredient4: string;
  strMeasure4: string;
  strIngredient5: string;
  strMeasure5: string;
  strIngredient6: string;
  strMeasure6: string;
  strIngredient7: string;
  strMeasure7: string;
  strIngredient8: string;
  strMeasure8: string;
  strIngredient9: string;
  strMeasure9: string;
  strIngredient10: string;
  strMeasure10: string;
  strIngredient11: string;
  strMeasure11: string;
  strIngredient12: string;
  strMeasure12: string;
  strIngredient13: string;
  strMeasure13: string;
  strIngredient14: string;
  strMeasure14: string;
  strIngredient15: string;
  strMeasure15: string;
  strIngredient16: string;
  strMeasure16: string;
  strIngredient17: string;
  strMeasure17: string;
  strIngredient18: string;
  strMeasure18: string;
  strIngredient19: string;
  strMeasure19: string;
  strIngredient20: string;
  strMeasure20: string;
}

/**
 * Structured ingredient data after parsing raw text
 */
export interface ParsedIngredient {
  rawText: string;
  normalizedName: string;
  amount: number | null;
  unit: string | null;
}

/**
 * Result of matching an ingredient to USDA FoodData Central
 */
export interface MatchResult {
  ingredient: ParsedIngredient;
  usdaFoodId: string | null;
  matchConfidence: 'exact' | 'keyword' | 'fallback' | 'unmatched';
  nutrition: NutritionData | null;
}

/**
 * Nutrition data from USDA FoodData Central
 */
export interface NutritionData {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Aggregated recipe-level macros
 */
export interface RecipeMacros {
  total: Macros;
  perServing: Macros | null;
  matchedIngredientCount: number;
  totalIngredientCount: number;
}

/**
 * Macro nutrient values
 */
export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Normalized recipe in FoodOS domain model format
 */
export interface NormalizedRecipe {
  id: string;
  source: 'themealdb';
  sourceRecipeId: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  category: string;
  cuisine: string;
  instructions: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  servings: number | null;
  cookTime: number;
  tags: string[];
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  enrichmentStatus: EnrichmentStatus;
  unmatchedIngredients: string[];
  authorId: null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Enrichment status indicator
 */
export type EnrichmentStatus = 'pending' | 'complete' | 'partial' | 'failed';

/**
 * Recipe ingredient with structured data
 */
export interface RecipeIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
  rawText: string;
}

/**
 * Recipe instruction step
 */
export interface RecipeStep {
  order: number;
  instruction: string;
}

/**
 * Job execution summary
 */
export interface JobSummary {
  totalFetched: number;
  totalSkipped: number;
  totalEnriched: number;
  totalPartial: number;
  totalFailed: number;
  unmatchedIngredients: string[];
  errors: string[];
  durationMs: number;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  stage: 'fetch' | 'parse' | 'match' | 'aggregate' | 'normalize' | 'store';
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log level
 */
export type LogLevel = 'info' | 'warn' | 'error';
