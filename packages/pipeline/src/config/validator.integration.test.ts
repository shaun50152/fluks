/**
 * Integration Tests for Environment Configuration Validator
 * 
 * Tests the validator with realistic environment configurations
 * to ensure it works correctly in production-like scenarios.
 */

import { validateConfig } from './validator';

describe('validateConfig - Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should validate a production-like configuration', () => {
    process.env.USDA_API_KEY = 'prod-usda-key-12345';
    process.env.SUPABASE_URL = 'https://myproject.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    process.env.RECIPE_FETCH_LIMIT = '500';
    process.env.RECIPE_BATCH_SIZE = '50';
    process.env.REFRESH_MODE = 'false';
    process.env.STALENESS_THRESHOLD_DAYS = '30';
    process.env.USDA_CONCURRENCY_LIMIT = '10';
    process.env.LOG_LEVEL = 'info';

    const config = validateConfig(process.env);

    expect(config).toEqual({
      usdaApiKey: 'prod-usda-key-12345',
      supabaseUrl: 'https://myproject.supabase.co',
      supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      recipeFetchLimit: 500,
      recipeBatchSize: 50,
      refreshMode: false,
      stalenessThresholdDays: 30,
      usdaConcurrencyLimit: 10,
      logLevel: 'info',
    });
  });

  it('should validate a development configuration with defaults', () => {
    process.env.USDA_API_KEY = 'dev-key';
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_KEY = 'dev-service-key';

    const config = validateConfig(process.env);

    expect(config.usdaApiKey).toBe('dev-key');
    expect(config.supabaseUrl).toBe('http://localhost:54321');
    expect(config.supabaseServiceKey).toBe('dev-service-key');
    expect(config.recipeFetchLimit).toBe(100);
    expect(config.recipeBatchSize).toBe(10);
    expect(config.refreshMode).toBe(false);
    expect(config.stalenessThresholdDays).toBe(90);
    expect(config.usdaConcurrencyLimit).toBe(5);
    expect(config.logLevel).toBe('info');
  });

  it('should validate a refresh mode configuration', () => {
    process.env.USDA_API_KEY = 'refresh-key';
    process.env.SUPABASE_URL = 'https://refresh.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'refresh-service-key';
    process.env.REFRESH_MODE = 'true';
    process.env.STALENESS_THRESHOLD_DAYS = '7';
    process.env.LOG_LEVEL = 'debug';

    const config = validateConfig(process.env);

    expect(config.refreshMode).toBe(true);
    expect(config.stalenessThresholdDays).toBe(7);
    expect(config.logLevel).toBe('debug');
  });

  it('should fail fast when required variables are missing in production', () => {
    // Simulate production environment with missing key
    process.env.SUPABASE_URL = 'https://prod.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'prod-service-key';
    // USDA_API_KEY is missing

    expect(() => validateConfig(process.env)).toThrow(
      'Missing required environment variable(s): USDA_API_KEY'
    );
  });

  it('should fail fast when configuration is invalid', () => {
    process.env.USDA_API_KEY = 'test-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.RECIPE_FETCH_LIMIT = '-50'; // Invalid: negative

    expect(() => validateConfig(process.env)).toThrow(
      'Invalid RECIPE_FETCH_LIMIT: -50 must be a positive integer'
    );
  });
});
