/**
 * Unit Tests for Environment Configuration Validator
 * 
 * Tests validate the configuration validation logic including:
 * - Required environment variable validation
 * - Optional environment variable defaults
 * - Positive integer validation
 * - Log level validation
 * - Error messages
 */

import { validateConfig } from './validator';

describe('validateConfig', () => {
  // Helper to create a valid base environment
  const createValidEnv = (): NodeJS.ProcessEnv => ({
    USDA_API_KEY: 'test-usda-key',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
  });

  describe('Required Environment Variables', () => {
    it('should validate successfully with all required variables', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.usdaApiKey).toBe('test-usda-key');
      expect(config.supabaseUrl).toBe('https://test.supabase.co');
      expect(config.supabaseServiceKey).toBe('test-service-key');
    });

    it('should throw error when USDA_API_KEY is missing', () => {
      const env = createValidEnv();
      delete env.USDA_API_KEY;

      expect(() => validateConfig(env)).toThrow(
        'Missing required environment variable(s): USDA_API_KEY'
      );
    });

    it('should throw error when SUPABASE_URL is missing', () => {
      const env = createValidEnv();
      delete env.SUPABASE_URL;

      expect(() => validateConfig(env)).toThrow(
        'Missing required environment variable(s): SUPABASE_URL'
      );
    });

    it('should throw error when SUPABASE_SERVICE_KEY is missing', () => {
      const env = createValidEnv();
      delete env.SUPABASE_SERVICE_KEY;

      expect(() => validateConfig(env)).toThrow(
        'Missing required environment variable(s): SUPABASE_SERVICE_KEY'
      );
    });

    it('should throw error when multiple required variables are missing', () => {
      const env = createValidEnv();
      delete env.USDA_API_KEY;
      delete env.SUPABASE_URL;

      expect(() => validateConfig(env)).toThrow(
        'Missing required environment variable(s): USDA_API_KEY, SUPABASE_URL'
      );
    });

    it('should throw error when required variable is empty string', () => {
      const env = createValidEnv();
      env.USDA_API_KEY = '';

      expect(() => validateConfig(env)).toThrow(
        'Missing required environment variable(s): USDA_API_KEY'
      );
    });

    it('should throw error when required variable is whitespace only', () => {
      const env = createValidEnv();
      env.SUPABASE_URL = '   ';

      expect(() => validateConfig(env)).toThrow(
        'Missing required environment variable(s): SUPABASE_URL'
      );
    });
  });

  describe('Optional Environment Variables with Defaults', () => {
    it('should use default value for RECIPE_FETCH_LIMIT when not provided', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.recipeFetchLimit).toBe(100);
    });

    it('should use default value for RECIPE_BATCH_SIZE when not provided', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.recipeBatchSize).toBe(10);
    });

    it('should use default value for REFRESH_MODE when not provided', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.refreshMode).toBe(false);
    });

    it('should use default value for STALENESS_THRESHOLD_DAYS when not provided', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.stalenessThresholdDays).toBe(90);
    });

    it('should use default value for USDA_CONCURRENCY_LIMIT when not provided', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.usdaConcurrencyLimit).toBe(5);
    });

    it('should use default value for LOG_LEVEL when not provided', () => {
      const env = createValidEnv();
      const config = validateConfig(env);

      expect(config.logLevel).toBe('info');
    });

    it('should use provided value for RECIPE_FETCH_LIMIT', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '50';
      const config = validateConfig(env);

      expect(config.recipeFetchLimit).toBe(50);
    });

    it('should use provided value for RECIPE_BATCH_SIZE', () => {
      const env = createValidEnv();
      env.RECIPE_BATCH_SIZE = '20';
      const config = validateConfig(env);

      expect(config.recipeBatchSize).toBe(20);
    });

    it('should parse REFRESH_MODE as true when set to "true"', () => {
      const env = createValidEnv();
      env.REFRESH_MODE = 'true';
      const config = validateConfig(env);

      expect(config.refreshMode).toBe(true);
    });

    it('should parse REFRESH_MODE as false when set to any other value', () => {
      const env = createValidEnv();
      env.REFRESH_MODE = 'false';
      const config = validateConfig(env);

      expect(config.refreshMode).toBe(false);
    });

    it('should use provided value for STALENESS_THRESHOLD_DAYS', () => {
      const env = createValidEnv();
      env.STALENESS_THRESHOLD_DAYS = '30';
      const config = validateConfig(env);

      expect(config.stalenessThresholdDays).toBe(30);
    });

    it('should use provided value for USDA_CONCURRENCY_LIMIT', () => {
      const env = createValidEnv();
      env.USDA_CONCURRENCY_LIMIT = '10';
      const config = validateConfig(env);

      expect(config.usdaConcurrencyLimit).toBe(10);
    });
  });

  describe('Positive Integer Validation', () => {
    it('should throw error when RECIPE_FETCH_LIMIT is not a number', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = 'not-a-number';

      expect(() => validateConfig(env)).toThrow(
        'Invalid RECIPE_FETCH_LIMIT: "not-a-number" is not a valid integer'
      );
    });

    it('should throw error when RECIPE_FETCH_LIMIT is zero', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '0';

      expect(() => validateConfig(env)).toThrow(
        'Invalid RECIPE_FETCH_LIMIT: 0 must be a positive integer'
      );
    });

    it('should throw error when RECIPE_FETCH_LIMIT is negative', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '-10';

      expect(() => validateConfig(env)).toThrow(
        'Invalid RECIPE_FETCH_LIMIT: -10 must be a positive integer'
      );
    });

    it('should throw error when RECIPE_BATCH_SIZE is not a number', () => {
      const env = createValidEnv();
      env.RECIPE_BATCH_SIZE = 'invalid';

      expect(() => validateConfig(env)).toThrow(
        'Invalid RECIPE_BATCH_SIZE: "invalid" is not a valid integer'
      );
    });

    it('should throw error when RECIPE_BATCH_SIZE is zero', () => {
      const env = createValidEnv();
      env.RECIPE_BATCH_SIZE = '0';

      expect(() => validateConfig(env)).toThrow(
        'Invalid RECIPE_BATCH_SIZE: 0 must be a positive integer'
      );
    });

    it('should throw error when STALENESS_THRESHOLD_DAYS is not a number', () => {
      const env = createValidEnv();
      env.STALENESS_THRESHOLD_DAYS = 'abc';

      expect(() => validateConfig(env)).toThrow(
        'Invalid STALENESS_THRESHOLD_DAYS: "abc" is not a valid integer'
      );
    });

    it('should throw error when USDA_CONCURRENCY_LIMIT is zero', () => {
      const env = createValidEnv();
      env.USDA_CONCURRENCY_LIMIT = '0';

      expect(() => validateConfig(env)).toThrow(
        'Invalid USDA_CONCURRENCY_LIMIT: 0 must be a positive integer'
      );
    });

    it('should accept decimal strings and parse as integer', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '50.7';
      const config = validateConfig(env);

      expect(config.recipeFetchLimit).toBe(50);
    });
  });

  describe('Log Level Validation', () => {
    it('should accept valid log level: debug', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = 'debug';
      const config = validateConfig(env);

      expect(config.logLevel).toBe('debug');
    });

    it('should accept valid log level: info', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = 'info';
      const config = validateConfig(env);

      expect(config.logLevel).toBe('info');
    });

    it('should accept valid log level: warn', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = 'warn';
      const config = validateConfig(env);

      expect(config.logLevel).toBe('warn');
    });

    it('should accept valid log level: error', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = 'error';
      const config = validateConfig(env);

      expect(config.logLevel).toBe('error');
    });

    it('should normalize log level to lowercase', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = 'DEBUG';
      const config = validateConfig(env);

      expect(config.logLevel).toBe('debug');
    });

    it('should throw error for invalid log level', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = 'invalid';

      expect(() => validateConfig(env)).toThrow(
        'Invalid LOG_LEVEL: "invalid". Valid values are: debug, info, warn, error'
      );
    });
  });

  describe('Complete Configuration', () => {
    it('should create complete config with all custom values', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '200';
      env.RECIPE_BATCH_SIZE = '25';
      env.REFRESH_MODE = 'true';
      env.STALENESS_THRESHOLD_DAYS = '60';
      env.USDA_CONCURRENCY_LIMIT = '8';
      env.LOG_LEVEL = 'debug';

      const config = validateConfig(env);

      expect(config).toEqual({
        usdaApiKey: 'test-usda-key',
        supabaseUrl: 'https://test.supabase.co',
        supabaseServiceKey: 'test-service-key',
        recipeFetchLimit: 200,
        recipeBatchSize: 25,
        refreshMode: true,
        stalenessThresholdDays: 60,
        usdaConcurrencyLimit: 8,
        logLevel: 'debug',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string for optional numeric variables', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '';
      const config = validateConfig(env);

      expect(config.recipeFetchLimit).toBe(100); // default
    });

    it('should handle whitespace for optional numeric variables', () => {
      const env = createValidEnv();
      env.RECIPE_BATCH_SIZE = '   ';
      const config = validateConfig(env);

      expect(config.recipeBatchSize).toBe(10); // default
    });

    it('should handle empty string for LOG_LEVEL', () => {
      const env = createValidEnv();
      env.LOG_LEVEL = '';
      const config = validateConfig(env);

      expect(config.logLevel).toBe('info'); // default
    });

    it('should handle very large positive integers', () => {
      const env = createValidEnv();
      env.RECIPE_FETCH_LIMIT = '999999';
      const config = validateConfig(env);

      expect(config.recipeFetchLimit).toBe(999999);
    });
  });
});
