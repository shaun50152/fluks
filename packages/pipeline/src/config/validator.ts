/**
 * Environment Configuration Validator
 * 
 * Validates and parses environment variables for the Recipe Ingestion Pipeline.
 * Implements fail-fast validation to catch configuration errors before any API calls.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface PipelineConfig {
  usdaApiKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  recipeFetchLimit: number;
  recipeBatchSize: number;
  refreshMode: boolean;
  stalenessThresholdDays: number;
  usdaConcurrencyLimit: number;
  logLevel: LogLevel;
}

/**
 * Validates and parses environment variables into a PipelineConfig object.
 * 
 * @param env - The environment variables object (typically process.env)
 * @returns A validated PipelineConfig object
 * @throws Error if required variables are missing or invalid
 * 
 * Required environment variables:
 * - USDA_API_KEY: API key for USDA FoodData Central
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key
 * 
 * Optional environment variables with defaults:
 * - RECIPE_FETCH_LIMIT: Max recipes to fetch per job run (default: 100)
 * - RECIPE_BATCH_SIZE: Recipes per batch (default: 10)
 * - REFRESH_MODE: Re-enrich existing recipes (default: false)
 * - STALENESS_THRESHOLD_DAYS: Days before recipe is stale (default: 90)
 * - USDA_CONCURRENCY_LIMIT: Max concurrent USDA API requests (default: 5)
 * - LOG_LEVEL: Logging level (default: info)
 */
export function validateConfig(env: NodeJS.ProcessEnv): PipelineConfig {
  // Validate required environment variables
  const required = ['USDA_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missing: string[] = [];

  for (const key of required) {
    if (!env[key] || env[key]?.trim() === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
      `Please set these variables before running the pipeline.`
    );
  }

  // Parse and validate optional numeric variables
  const recipeFetchLimit = parsePositiveInteger(
    env.RECIPE_FETCH_LIMIT,
    'RECIPE_FETCH_LIMIT',
    100
  );

  const recipeBatchSize = parsePositiveInteger(
    env.RECIPE_BATCH_SIZE,
    'RECIPE_BATCH_SIZE',
    10
  );

  const stalenessThresholdDays = parsePositiveInteger(
    env.STALENESS_THRESHOLD_DAYS,
    'STALENESS_THRESHOLD_DAYS',
    90
  );

  const usdaConcurrencyLimit = parsePositiveInteger(
    env.USDA_CONCURRENCY_LIMIT,
    'USDA_CONCURRENCY_LIMIT',
    5
  );

  // Parse boolean refresh mode
  const refreshMode = env.REFRESH_MODE === 'true';

  // Parse and validate log level
  const logLevel = parseLogLevel(env.LOG_LEVEL);

  return {
    usdaApiKey: env.USDA_API_KEY!,
    supabaseUrl: env.SUPABASE_URL!,
    supabaseServiceKey: env.SUPABASE_SERVICE_KEY!,
    recipeFetchLimit,
    recipeBatchSize,
    refreshMode,
    stalenessThresholdDays,
    usdaConcurrencyLimit,
    logLevel,
  };
}

/**
 * Parses a string value as a positive integer.
 * 
 * @param value - The string value to parse
 * @param name - The name of the environment variable (for error messages)
 * @param defaultValue - The default value to use if the value is undefined
 * @returns The parsed positive integer
 * @throws Error if the value is not a positive integer
 */
function parsePositiveInteger(
  value: string | undefined,
  name: string,
  defaultValue: number
): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(
      `Invalid ${name}: "${value}" is not a valid integer. ` +
      `Please provide a positive integer value.`
    );
  }

  if (parsed <= 0) {
    throw new Error(
      `Invalid ${name}: ${parsed} must be a positive integer (greater than 0).`
    );
  }

  return parsed;
}

/**
 * Parses and validates the log level.
 * 
 * @param value - The log level string
 * @returns A valid LogLevel
 * @throws Error if the log level is invalid
 */
function parseLogLevel(value: string | undefined): LogLevel {
  const defaultLevel: LogLevel = 'info';

  if (value === undefined || value.trim() === '') {
    return defaultLevel;
  }

  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const normalized = value.toLowerCase() as LogLevel;

  if (!validLevels.includes(normalized)) {
    throw new Error(
      `Invalid LOG_LEVEL: "${value}". ` +
      `Valid values are: ${validLevels.join(', ')}.`
    );
  }

  return normalized;
}
