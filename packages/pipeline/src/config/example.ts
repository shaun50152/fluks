/**
 * Example usage of the configuration validator
 * 
 * This file demonstrates how to use the validateConfig function
 * in the Recipe Ingestion Pipeline.
 */

import { validateConfig } from './validator';

// Example 1: Validate with current environment
try {
  const config = validateConfig(process.env);
  console.log('✓ Configuration validated successfully!');
  console.log('\nConfiguration:');
  console.log(`  USDA API Key: ${config.usdaApiKey.substring(0, 10)}...`);
  console.log(`  Supabase URL: ${config.supabaseUrl}`);
  console.log(`  Recipe Fetch Limit: ${config.recipeFetchLimit}`);
  console.log(`  Recipe Batch Size: ${config.recipeBatchSize}`);
  console.log(`  Refresh Mode: ${config.refreshMode}`);
  console.log(`  Staleness Threshold: ${config.stalenessThresholdDays} days`);
  console.log(`  USDA Concurrency Limit: ${config.usdaConcurrencyLimit}`);
  console.log(`  Log Level: ${config.logLevel}`);
} catch (error) {
  console.error('✗ Configuration validation failed:');
  console.error(`  ${(error as Error).message}`);
  process.exit(1);
}

// Example 2: Validate with custom environment
const customEnv = {
  USDA_API_KEY: 'test-key-12345',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_KEY: 'test-service-key',
  RECIPE_FETCH_LIMIT: '50',
  LOG_LEVEL: 'debug',
};

try {
  const customConfig = validateConfig(customEnv);
  console.log('\n✓ Custom configuration validated successfully!');
  console.log(`  Fetch Limit: ${customConfig.recipeFetchLimit}`);
  console.log(`  Log Level: ${customConfig.logLevel}`);
} catch (error) {
  console.error('✗ Custom configuration validation failed:');
  console.error(`  ${(error as Error).message}`);
}
