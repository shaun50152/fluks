/**
 * Example usage of the retry utility with exponential backoff
 * 
 * This file demonstrates how to use retryWithBackoff in real-world scenarios
 */

import { retryWithBackoff } from './retry';

/**
 * Example 1: Retrying an HTTP API call
 */
async function fetchRecipeFromAPI(recipeId: string): Promise<any> {
  const response = await fetch(`https://api.example.com/recipes/${recipeId}`);
  
  if (!response.ok) {
    const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.statusCode = response.status;
    throw error;
  }
  
  return response.json();
}

async function fetchRecipeWithRetry(recipeId: string): Promise<any> {
  return retryWithBackoff(
    () => fetchRecipeFromAPI(recipeId),
    3,    // max 3 attempts
    1000  // 1 second base delay
  );
}

/**
 * Example 2: Retrying a database operation
 */
async function saveToDatabase(_data: any): Promise<void> {
  // Simulated database operation that might fail
  const random = Math.random();
  
  if (random < 0.3) {
    const error: any = new Error('Database connection timeout');
    error.code = 'ETIMEDOUT';
    throw error;
  }
  
  if (random < 0.5) {
    const error: any = new Error('Internal server error');
    error.statusCode = 500;
    throw error;
  }
  
  // Success
  console.log('Data saved successfully');
}

async function saveWithRetry(data: any): Promise<void> {
  return retryWithBackoff(
    () => saveToDatabase(data),
    5,    // max 5 attempts for critical operations
    2000  // 2 second base delay
  );
}

/**
 * Example 3: Handling non-retryable errors
 */
async function validateAndFetch(id: string): Promise<any> {
  if (!id) {
    const error: any = new Error('Invalid ID');
    error.statusCode = 400; // 4xx errors are not retried
    throw error;
  }
  
  return fetchRecipeFromAPI(id);
}

async function validateAndFetchWithRetry(id: string): Promise<any> {
  try {
    return await retryWithBackoff(
      () => validateAndFetch(id),
      3,
      1000
    );
  } catch (error: any) {
    if (error.statusCode === 400) {
      console.error('Validation error - not retried:', error.message);
    } else {
      console.error('Failed after retries:', error.message);
    }
    throw error;
  }
}

/**
 * Example 4: Custom retry configuration for rate-limited APIs
 */
async function fetchFromRateLimitedAPI(endpoint: string): Promise<any> {
  const response = await fetch(endpoint);
  
  if (response.status === 429) {
    const error: any = new Error('Rate limit exceeded');
    error.statusCode = 429;
    throw error;
  }
  
  return response.json();
}

async function fetchWithRateLimitRetry(endpoint: string): Promise<any> {
  return retryWithBackoff(
    () => fetchFromRateLimitedAPI(endpoint),
    5,     // More retries for rate limits
    5000   // Longer base delay (5 seconds)
  );
  // Delays will be: 5s, 10s, 20s, 40s
}

// Export examples for documentation
export {
  fetchRecipeWithRetry,
  saveWithRetry,
  validateAndFetchWithRetry,
  fetchWithRateLimitRetry,
};
