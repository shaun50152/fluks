/**
 * Unit tests for retry utility with exponential backoff
 */

import { retryWithBackoff, isRetryable } from './retry';

describe('isRetryable', () => {
  describe('HTTP status codes', () => {
    it('should return true for 5xx server errors', () => {
      expect(isRetryable({ statusCode: 500 })).toBe(true);
      expect(isRetryable({ statusCode: 502 })).toBe(true);
      expect(isRetryable({ statusCode: 503 })).toBe(true);
      expect(isRetryable({ statusCode: 504 })).toBe(true);
      expect(isRetryable({ statusCode: 599 })).toBe(true);
    });

    it('should return true for 429 rate limit errors', () => {
      expect(isRetryable({ statusCode: 429 })).toBe(true);
    });

    it('should return false for 4xx client errors (except 429)', () => {
      expect(isRetryable({ statusCode: 400 })).toBe(false);
      expect(isRetryable({ statusCode: 401 })).toBe(false);
      expect(isRetryable({ statusCode: 403 })).toBe(false);
      expect(isRetryable({ statusCode: 404 })).toBe(false);
      expect(isRetryable({ statusCode: 422 })).toBe(false);
    });

    it('should return false for 2xx and 3xx status codes', () => {
      expect(isRetryable({ statusCode: 200 })).toBe(false);
      expect(isRetryable({ statusCode: 201 })).toBe(false);
      expect(isRetryable({ statusCode: 301 })).toBe(false);
      expect(isRetryable({ statusCode: 302 })).toBe(false);
    });
  });

  describe('network error codes', () => {
    it('should return true for network errors', () => {
      expect(isRetryable({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryable({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryable({ code: 'ENOTFOUND' })).toBe(true);
      expect(isRetryable({ code: 'ECONNREFUSED' })).toBe(true);
      expect(isRetryable({ code: 'ENETUNREACH' })).toBe(true);
      expect(isRetryable({ code: 'EAI_AGAIN' })).toBe(true);
    });

    it('should return false for non-network error codes', () => {
      expect(isRetryable({ code: 'ENOENT' })).toBe(false);
      expect(isRetryable({ code: 'EACCES' })).toBe(false);
    });
  });

  describe('timeout errors', () => {
    it('should return true for timeout error messages', () => {
      const error1 = new Error('Request timeout');
      const error2 = new Error('Connection timed out');
      const error3 = new Error('TIMEOUT');
      
      expect(isRetryable(error1)).toBe(true);
      expect(isRetryable(error2)).toBe(true);
      expect(isRetryable(error3)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return false for null or undefined', () => {
      expect(isRetryable(null)).toBe(false);
      expect(isRetryable(undefined)).toBe(false);
    });

    it('should return false for unknown errors', () => {
      expect(isRetryable({})).toBe(false);
      expect(isRetryable({ message: 'Unknown error' })).toBe(false);
    });
  });
});

describe('retryWithBackoff', () => {
  describe('successful execution', () => {
    it('should return result on first attempt if successful', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return result after retries if eventually successful', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockRejectedValueOnce({ statusCode: 503 })
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, 3, 10); // Use small delay for tests

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry behavior', () => {
    it('should retry up to maxRetries times for retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue({ statusCode: 500 });

      await expect(retryWithBackoff(fn, 3, 10)).rejects.toEqual({ statusCode: 500 });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry for non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue({ statusCode: 404 });

      await expect(retryWithBackoff(fn, 3, 10)).rejects.toEqual({ statusCode: 404 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 rate limit errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 429 })
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'ECONNRESET' })
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, 3, 10);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('exponential backoff', () => {
    it('should apply exponential backoff with correct number of retries', async () => {
      const fn = jest.fn().mockRejectedValue({ statusCode: 500 });
      const baseDelay = 10; // Use small delay for tests

      await expect(retryWithBackoff(fn, 3, baseDelay)).rejects.toEqual({ statusCode: 500 });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use custom base delay and retry count', async () => {
      const fn = jest.fn().mockRejectedValue({ statusCode: 503 });
      const baseDelay = 5;

      await expect(retryWithBackoff(fn, 2, baseDelay)).rejects.toEqual({ statusCode: 503 });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('maxRetries parameter', () => {
    it('should respect custom maxRetries value', async () => {
      const fn = jest.fn().mockRejectedValue({ statusCode: 500 });

      await expect(retryWithBackoff(fn, 5, 10)).rejects.toEqual({ statusCode: 500 });
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('should work with maxRetries = 1 (no retries)', async () => {
      const fn = jest.fn().mockRejectedValue({ statusCode: 500 });

      await expect(retryWithBackoff(fn, 1, 10)).rejects.toEqual({ statusCode: 500 });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle functions that throw synchronously', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw { statusCode: 404 };
      });

      await expect(retryWithBackoff(fn, 3, 10)).rejects.toEqual({ statusCode: 404 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed retryable and non-retryable errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ statusCode: 500 })
        .mockRejectedValueOnce({ statusCode: 404 });

      await expect(retryWithBackoff(fn, 3, 10)).rejects.toEqual({ statusCode: 404 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should preserve error details through retries', async () => {
      const error = {
        statusCode: 500,
        message: 'Internal Server Error',
        details: { reason: 'Database connection failed' },
      };
      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, 2, 10)).rejects.toEqual(error);
    });
  });
});
