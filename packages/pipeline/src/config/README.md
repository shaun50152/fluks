# Configuration Module

This module provides environment configuration validation for the Recipe Ingestion Pipeline.

## Overview

The configuration validator ensures that all required environment variables are present and valid before the pipeline starts processing. This implements a fail-fast approach to catch configuration errors early.

## Usage

```typescript
import { validateConfig } from './config/validator';

// Validate environment variables
const config = validateConfig(process.env);

// Use the validated configuration
console.log(`Fetching ${config.recipeFetchLimit} recipes`);
console.log(`Using USDA API with concurrency limit: ${config.usdaConcurrencyLimit}`);
```

## Configuration Interface

```typescript
interface PipelineConfig {
  // Required
  usdaApiKey: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  
  // Optional with defaults
  recipeFetchLimit: number;        // default: 100
  recipeBatchSize: number;          // default: 10
  refreshMode: boolean;             // default: false
  stalenessThresholdDays: number;   // default: 90
  usdaConcurrencyLimit: number;     // default: 5
  logLevel: LogLevel;               // default: 'info'
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

## Environment Variables

### Required Variables

These variables **must** be set or the validator will throw an error:

- `USDA_API_KEY`: API key for USDA FoodData Central
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key

### Optional Variables

These variables have default values if not provided:

- `RECIPE_FETCH_LIMIT`: Maximum recipes to fetch per job run (default: 100)
- `RECIPE_BATCH_SIZE`: Number of recipes to process per batch (default: 10)
- `REFRESH_MODE`: Whether to re-enrich existing recipes (default: false)
- `STALENESS_THRESHOLD_DAYS`: Days before a recipe is considered stale (default: 90)
- `USDA_CONCURRENCY_LIMIT`: Maximum concurrent USDA API requests (default: 5)
- `LOG_LEVEL`: Logging level - debug, info, warn, or error (default: info)

## Validation Rules

### Required Variables
- Must not be empty or whitespace-only
- Throws descriptive error if missing

### Numeric Variables
- Must be positive integers (> 0)
- Throws error if not a valid number or if zero/negative
- Decimal values are truncated to integers

### Log Level
- Must be one of: debug, info, warn, error
- Case-insensitive (normalized to lowercase)
- Throws error if invalid

### Boolean Variables
- `REFRESH_MODE` is true only when set to the string "true"
- Any other value (including "false") is treated as false

## Error Handling

The validator implements fail-fast error handling:

```typescript
try {
  const config = validateConfig(process.env);
  // Proceed with pipeline
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}
```

### Error Messages

The validator provides descriptive error messages:

- Missing required variables: `"Missing required environment variable(s): USDA_API_KEY, SUPABASE_URL"`
- Invalid numeric value: `"Invalid RECIPE_FETCH_LIMIT: "abc" is not a valid integer"`
- Invalid positive integer: `"Invalid RECIPE_BATCH_SIZE: 0 must be a positive integer"`
- Invalid log level: `"Invalid LOG_LEVEL: "trace". Valid values are: debug, info, warn, error"`

## Example .env File

```env
# Required
USDA_API_KEY=your_usda_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here

# Optional (showing defaults)
RECIPE_FETCH_LIMIT=100
RECIPE_BATCH_SIZE=10
REFRESH_MODE=false
STALENESS_THRESHOLD_DAYS=90
USDA_CONCURRENCY_LIMIT=5
LOG_LEVEL=info
```

## Testing

The module includes comprehensive unit and integration tests:

```bash
# Run all config tests
npm test -- config/

# Run unit tests only
npm test -- validator.test.ts

# Run integration tests only
npm test -- validator.integration.test.ts
```

## Requirements Validation

This module validates the following requirements:

- **9.1**: Reads USDA API key from `USDA_API_KEY` environment variable
- **9.2**: Reads optional fetch limit from `RECIPE_FETCH_LIMIT` with default of 100
- **9.3**: Reads optional batch size from `RECIPE_BATCH_SIZE` with default of 10
- **9.4**: Reads Supabase credentials from `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- **9.5**: Logs descriptive error and exits with non-zero status when required variables are missing
- **9.6**: Validates that numeric variables are positive integers before starting the job
