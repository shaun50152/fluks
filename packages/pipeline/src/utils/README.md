# Utils Module

This directory contains utility modules used throughout the Recipe Ingestion Pipeline.

## Logger

The `logger.ts` module provides structured JSON logging for the pipeline.

### Features

- **Structured JSON output**: All logs are formatted as JSON with consistent fields
- **Log levels**: Supports `debug`, `info`, `warn`, and `error` levels
- **Pipeline stages**: Logs are tagged with the pipeline stage (`fetch`, `parse`, `match`, `aggregate`, `normalize`, `store`, `config`, `job`)
- **Metadata support**: Attach arbitrary metadata to log entries for rich context
- **Configurable**: Set minimum log level to control verbosity

### Log Format

Each log entry is a JSON object with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "stage": "fetch",
  "message": "Recipes fetched successfully",
  "metadata": {
    "count": 50,
    "source": "themealdb"
  }
}
```

### Usage

```typescript
import { logger } from './utils/logger';

// Basic logging
logger.info('fetch', 'Starting recipe fetch');

// Logging with metadata
logger.info('fetch', 'Recipes fetched', {
  count: 50,
  duration_ms: 1234
});

// Error logging
logger.error('store', 'Database connection failed', {
  error: 'Connection timeout',
  retry_count: 3
});

// Warning logging
logger.warn('parse', 'Malformed ingredient string', {
  raw_text: 'invalid input'
});

// Debug logging (only output if log level is debug)
logger.debug('match', 'Checking cache', {
  ingredient: 'flour',
  cache_hit: true
});

// Change log level dynamically
logger.setLevel('debug'); // Show all logs
logger.setLevel('warn');  // Only show warnings and errors
```

### Log Levels

The logger supports four log levels with increasing priority:

1. **debug**: Detailed diagnostic information for development
2. **info**: General informational messages about pipeline progress
3. **warn**: Warning messages for recoverable issues
4. **error**: Error messages for failures and exceptions

Set the minimum log level when creating a logger instance or use `setLevel()` to change it dynamically:

```typescript
import { Logger } from './utils/logger';

// Create logger with minimum level 'warn'
const logger = new Logger('warn');

// Change level dynamically
logger.setLevel('debug');
```

### Pipeline Stages

Logs are tagged with the pipeline stage where they occur:

- **fetch**: Recipe fetching from TheMealDB
- **parse**: Ingredient parsing
- **match**: USDA nutrition matching
- **aggregate**: Macro aggregation
- **normalize**: Recipe normalization
- **store**: Database storage
- **config**: Configuration and validation
- **job**: Job orchestration and summary

### Testing

The logger is fully tested with unit tests covering:

- Log level filtering
- Structured JSON format
- Metadata handling
- Edge cases (empty messages, special characters, null values)

Run tests with:

```bash
npm test -- logger.test.ts
```

### Examples

See `logger.example.ts` for comprehensive usage examples including:

- Basic logging
- Logging with metadata
- Error and warning logging
- Debug logging
- Job summary logging
- Recipe enrichment logging
- Dynamic log level changes
