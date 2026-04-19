/**
 * Example usage of the Logger utility
 * 
 * This file demonstrates how to use the structured logger throughout the pipeline.
 */

import { logger } from './logger';

// Example 1: Basic logging without metadata
export function exampleBasicLogging() {
  logger.info('job', 'Starting recipe ingestion job');
  logger.info('fetch', 'Fetching recipes from TheMealDB');
  logger.info('job', 'Job completed successfully');
}

// Example 2: Logging with metadata
export function exampleLoggingWithMetadata() {
  logger.info('fetch', 'Recipes fetched successfully', {
    count: 50,
    source: 'themealdb',
    duration_ms: 1234,
  });

  logger.info('parse', 'Ingredient parsed', {
    raw_text: '2 cups flour',
    normalized_name: 'flour',
    amount: 2,
    unit: 'cups',
  });

  logger.info('match', 'USDA match found', {
    ingredient: 'chicken breast',
    usda_food_id: '171077',
    match_confidence: 'exact',
  });
}

// Example 3: Error logging
export function exampleErrorLogging() {
  logger.error('fetch', 'TheMealDB API call failed', {
    http_status: 429,
    error_message: 'Rate limit exceeded',
    recipe_id: 'meal_12345',
  });

  logger.error('match', 'USDA API call failed', {
    http_status: 500,
    error_message: 'Internal server error',
    ingredient_name: 'quinoa',
  });

  logger.error('store', 'Database connection failure', {
    error: 'Connection timeout',
    retry_count: 3,
  });
}

// Example 4: Warning logging
export function exampleWarningLogging() {
  logger.warn('parse', 'Ingredient string contains multiple quantities', {
    raw_text: '1-2 cups flour',
    extracted_amount: 1,
    note: 'Using first quantity',
  });

  logger.warn('match', 'No USDA match found for ingredient', {
    ingredient_name: 'exotic spice',
    match_confidence: 'unmatched',
  });
}

// Example 5: Debug logging
export function exampleDebugLogging() {
  logger.debug('parse', 'Parsing ingredient string', {
    input: '2 tablespoons olive oil',
    step: 'extracting quantity',
  });

  logger.debug('match', 'Checking USDA cache', {
    ingredient: 'flour',
    cache_hit: true,
  });
}

// Example 6: Job summary logging
export function exampleJobSummaryLogging() {
  logger.info('job', 'Job summary', {
    total_fetched: 100,
    total_skipped: 10,
    total_enriched: 75,
    total_partial: 10,
    total_failed: 5,
    duration_ms: 45000,
    unmatched_ingredients: ['exotic spice', 'rare herb'],
  });
}

// Example 7: Recipe enrichment logging
export function exampleRecipeEnrichmentLogging() {
  logger.info('normalize', 'Recipe enriched successfully', {
    recipe_id: 'recipe_123',
    title: 'Chicken Pasta',
    enrichment_status: 'complete',
    matched_ingredients: 8,
    total_ingredients: 8,
    macros: {
      calories: 450,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
    },
  });

  logger.info('normalize', 'Recipe partially enriched', {
    recipe_id: 'recipe_456',
    title: 'Exotic Curry',
    enrichment_status: 'partial',
    matched_ingredients: 6,
    total_ingredients: 10,
    unmatched_ingredients: ['lemongrass', 'galangal', 'kaffir lime leaves', 'fish sauce'],
  });
}

// Example 8: Changing log level dynamically
export function exampleDynamicLogLevel() {
  // Set to debug for verbose logging during development
  logger.setLevel('debug');
  logger.debug('config', 'Debug mode enabled');

  // Set to info for production
  logger.setLevel('info');
  logger.debug('config', 'This will not be logged');
  logger.info('config', 'This will be logged');
}
