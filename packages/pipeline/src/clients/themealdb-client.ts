/**
 * TheMealDB API Client
 * 
 * Fetches recipes from TheMealDB API with rate limiting, error handling, and exponential backoff.
 * Supports fetching multiple recipes and fetching by ID.
 */

import { TheMealDBRecipe } from '../types/domain';
import { logger } from '../utils/logger';

/**
 * Response structure from TheMealDB API
 */
interface TheMealDBResponse {
  meals: TheMealDBRecipe[] | null;
}

/**
 * Client for interacting with TheMealDB API
 */
export class TheMealDBClient {
  private readonly baseUrl = 'https://www.themealdb.com/api/json/v1/1';
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;

  /**
   * Fetch multiple recipes from TheMealDB
   * Uses a combination of random and category-based fetching to get diverse recipes
   * 
   * @param limit - Maximum number of recipes to fetch
   * @returns Array of TheMealDB recipes
   */
  async fetchRecipes(limit: number): Promise<TheMealDBRecipe[]> {
    logger.info('fetch', `Starting to fetch ${limit} recipes from TheMealDB`);
    
    const recipes: TheMealDBRecipe[] = [];
    const seenIds = new Set<string>();
    
    // Fetch random recipes until we reach the limit
    let attempts = 0;
    const maxAttempts = limit * 3; // Allow some retries for duplicates
    
    while (recipes.length < limit && attempts < maxAttempts) {
      attempts++;
      
      try {
        const recipe = await this.fetchRandomRecipe();
        
        if (recipe && !seenIds.has(recipe.idMeal)) {
          seenIds.add(recipe.idMeal);
          recipes.push(recipe);
          logger.debug('fetch', `Fetched recipe: ${recipe.strMeal}`, { 
            recipeId: recipe.idMeal,
            count: recipes.length 
          });
        }
      } catch (error) {
        logger.warn('fetch', `Failed to fetch random recipe (attempt ${attempts})`, {
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue to next attempt
      }
    }
    
    logger.info('fetch', `Successfully fetched ${recipes.length} recipes`, {
      requested: limit,
      fetched: recipes.length,
      attempts
    });
    
    return recipes;
  }

  /**
   * Fetch a single recipe by ID
   * 
   * @param id - TheMealDB recipe ID
   * @returns Recipe or null if not found
   */
  async fetchRecipeById(id: string): Promise<TheMealDBRecipe | null> {
    const url = `${this.baseUrl}/lookup.php?i=${id}`;
    
    try {
      const response = await this.fetchWithRetry(url);
      
      if (response.meals && response.meals.length > 0) {
        logger.debug('fetch', `Fetched recipe by ID: ${id}`, {
          recipeName: response.meals[0].strMeal
        });
        return response.meals[0];
      }
      
      logger.warn('fetch', `Recipe not found: ${id}`);
      return null;
    } catch (error) {
      logger.error('fetch', `Failed to fetch recipe by ID: ${id}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Fetch a random recipe from TheMealDB
   * 
   * @returns Random recipe or null if fetch fails
   */
  private async fetchRandomRecipe(): Promise<TheMealDBRecipe | null> {
    const url = `${this.baseUrl}/random.php`;
    
    const response = await this.fetchWithRetry(url);
    
    if (response.meals && response.meals.length > 0) {
      return response.meals[0];
    }
    
    return null;
  }

  /**
   * Fetch with exponential backoff retry logic
   * 
   * @param url - URL to fetch
   * @returns Parsed JSON response
   */
  private async fetchWithRetry(url: string): Promise<TheMealDBResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        
        // Handle rate limiting (429)
        if (response.status === 429) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn('fetch', `Rate limited, retrying after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: this.maxRetries
          });
          await this.sleep(delay);
          continue;
        }
        
        // Handle server errors (5xx)
        if (response.status >= 500) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn('fetch', `Server error ${response.status}, retrying after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            status: response.status
          });
          await this.sleep(delay);
          continue;
        }
        
        // Handle client errors (4xx except 429)
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Success - parse and return
        const data = await response.json() as TheMealDBResponse;
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on non-retryable errors
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }
        
        // Retry with backoff
        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn('fetch', `Request failed, retrying after ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    
    // All retries exhausted
    throw new Error(`Failed after ${this.maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Calculate exponential backoff delay
   * 
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    return this.baseDelayMs * Math.pow(2, attempt);
  }

  /**
   * Check if an error is retryable
   * 
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Network errors, timeouts, and connection issues are retryable
    const retryableMessages = [
      'fetch failed',
      'network',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];
    
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Sleep for a specified duration
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
