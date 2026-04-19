/**
 * Retry utility with exponential backoff for handling transient failures
 * in API calls and network operations.
 */

/**
 * Error types that can be retried
 */
export interface RetryableError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Determines if an error is retryable based on its characteristics
 * 
 * Retryable errors:
 * - 5xx server errors (500-599)
 * - 429 rate limit errors
 * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND, etc.)
 * 
 * Non-retryable errors:
 * - 4xx client errors (except 429)
 * - Validation errors
 * 
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export function isRetryable(error: unknown): boolean {
  if (!error) return false;

  const err = error as RetryableError;

  // Check for HTTP status codes
  if (err.statusCode !== undefined) {
    // Retry on 5xx errors
    if (err.statusCode >= 500 && err.statusCode < 600) {
      return true;
    }
    // Retry on 429 rate limit
    if (err.statusCode === 429) {
      return true;
    }
    // Do not retry on 4xx errors (except 429)
    if (err.statusCode >= 400 && err.statusCode < 500) {
      return false;
    }
  }

  // Check for network error codes
  const networkErrorCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ENETUNREACH',
    'EAI_AGAIN',
  ];

  if (err.code && networkErrorCodes.includes(err.code)) {
    return true;
  }

  // Check for timeout errors in message
  const message = err.message || (err as Error).message;
  if (message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return true;
    }
  }

  // Default to not retrying unknown errors
  return false;
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * Implements exponential backoff strategy: baseDelay × 2^attempt
 * 
 * Example:
 * - Attempt 0: no delay (first try)
 * - Attempt 1: baseDelay × 2^0 = 1000ms
 * - Attempt 2: baseDelay × 2^1 = 2000ms
 * - Attempt 3: baseDelay × 2^2 = 4000ms
 * 
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns Promise resolving to the function result
 * @throws The last error if all retries are exhausted or if error is not retryable
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // If the error is not retryable, throw immediately
      if (!isRetryable(error)) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = baseDelayMs * Math.pow(2, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
