# Recipe Ingestion and Enrichment Pipeline

A standalone Node.js/TypeScript backend service that fetches recipes from TheMealDB API, enriches them with USDA nutrition data, and caches the results in Supabase for the FoodOS mobile app. The pipeline ensures zero third-party API latency during user interactions by prefetching and enriching recipe data offline.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Integration with FoodOS](#integration-with-foodos)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Overview

### Features

- **Fetch recipes** from TheMealDB (free API)
- **Parse ingredient strings** into structured objects with normalized names, amounts, and units
- **Match ingredients** to USDA FoodData Central nutrition data using a layered matching strategy
- **Aggregate nutrition** into recipe-level macros (calories, protein, carbs, fat)
- **Store enriched recipes** in Supabase for fast runtime reads
- **Idempotent ingestion** - safe to rerun without creating duplicates
- **Graceful degradation** - partial enrichment failures don't block recipe storage
- **Comprehensive logging** - structured JSON logs for observability

### Design Principles

- **Idempotent by default**: Running the job multiple times produces the same final state
- **Graceful degradation**: Partial enrichment failures don't block recipe storage
- **Fail-fast validation**: Environment and configuration errors are caught before any API calls
- **Observable**: Comprehensive logging for every stage of the pipeline
- **Modular**: Each stage (fetch, parse, match, aggregate, store) is independently testable

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Pipeline Orchestrator                        │
│                  (Job Runner / CLI Entry Point)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Sources                                │
│  ┌──────────────────┐              ┌─────────────────────────┐  │
│  │  TheMealDB API   │              │  USDA FoodData Central  │  │
│  └──────────────────┘              └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Processing Modules                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ TheMealDB    │→ │  Ingredient  │→ │   USDA Matcher       │  │
│  │   Client     │  │    Parser    │  │   + Cache            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                 │                │
│                                                 ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Supabase   │← │    Recipe    │← │   Macro Aggregator   │  │
│  │    Client    │  │  Normalizer  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                               │
│                   Supabase PostgreSQL                            │
│                    (recipes table)                               │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FoodOS App Integration                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   FoodOS     │  │ Recommendation│  │   FeedRanker Edge    │  │
│  │ Mobile App   │  │    Engine     │  │      Function        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Responsibility |
|-----------|---------------|
| **TheMealDB Client** | Fetches recipes from TheMealDB API, handles rate limits, deduplicates by source_recipe_id |
| **Ingredient Parser** | Parses raw ingredient strings into structured objects with normalized names, amounts, and units |
| **USDA Matcher** | Matches normalized ingredient names to USDA FoodData Central entries using a layered strategy, caches results |
| **Macro Aggregator** | Sums ingredient-level nutrition data into recipe-level macros, handles unmatched ingredients gracefully |
| **Recipe Normalizer** | Transforms TheMealDB recipe format into FoodOS domain model |
| **Supabase Client** | Upserts normalized recipes into Supabase, handles conflicts using source_recipe_id unique constraint |

## Installation

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- USDA FoodData Central API key (free at https://fdc.nal.usda.gov/api-key-signup.html)

### Steps

1. **Clone the repository** (if not already done):
```bash
git clone <repository-url>
cd recipe-pipeline
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials (see [Environment Variables](#environment-variables) section).

4. **Run database migrations**:
```bash
npm run migrate
```

This will extend the existing `recipes` table with enrichment metadata columns.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `USDA_API_KEY` | USDA FoodData Central API key | `abc123...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (not anon key!) | `eyJhbGc...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RECIPE_FETCH_LIMIT` | `100` | Maximum recipes to fetch per job run |
| `RECIPE_BATCH_SIZE` | `10` | Recipes per batch for processing |
| `REFRESH_MODE` | `false` | Re-enrich existing recipes older than staleness threshold |
| `STALENESS_THRESHOLD_DAYS` | `90` | Days before recipe is considered stale (refresh mode only) |
| `USDA_CONCURRENCY_LIMIT` | `5` | Maximum concurrent USDA API requests |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |

### Getting API Keys

**USDA FoodData Central API Key**:
1. Visit https://fdc.nal.usda.gov/api-key-signup.html
2. Fill out the form with your email
3. Check your email for the API key
4. Add to `.env` as `USDA_API_KEY`

**Supabase Credentials**:
1. Log in to your Supabase project
2. Go to Settings → API
3. Copy the "Project URL" → add to `.env` as `SUPABASE_URL`
4. Copy the "service_role" key (NOT the anon key) → add to `.env` as `SUPABASE_SERVICE_KEY`

## Usage

### Run Migration

Before the first ingestion, run the database migration to extend the `recipes` table:

```bash
npm run migrate
```

This is idempotent and safe to run multiple times.

### Run Ingestion

Fetch and enrich recipes from TheMealDB:

```bash
npm run ingest
```

**What happens**:
1. Validates environment configuration
2. Fetches recipes from TheMealDB (up to `RECIPE_FETCH_LIMIT`)
3. Parses ingredients and matches to USDA nutrition data
4. Aggregates nutrition into recipe-level macros
5. Stores enriched recipes in Supabase
6. Logs summary statistics

**Example output**:
```
=== Recipe Ingestion Pipeline ===
Fetching recipes from TheMealDB...
Fetched 100 recipes
Processing batch 1/10...
Processing batch 2/10...
...
=== Job Summary ===
Total Fetched: 100
Total Skipped: 0
Total Enriched: 85
Total Partial: 12
Total Failed: 3
Unmatched Ingredients: ["saffron threads", "kaffir lime leaves", ...]
Duration: 12m 34s
```

### Run Refresh Mode

Re-enrich existing recipes that are older than the staleness threshold:

```bash
REFRESH_MODE=true npm run ingest
```

This will:
- Query recipes with `updated_at` older than `STALENESS_THRESHOLD_DAYS`
- Re-fetch from TheMealDB
- Re-enrich with latest USDA data
- Update macros, image URLs, and enrichment status
- Preserve original `created_at` timestamp

### Development Mode

Run the pipeline with TypeScript directly (no build step):

```bash
npm run dev
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Integration with FoodOS

The enriched recipes integrate seamlessly with the existing FoodOS mobile app:

### 1. Recipe Domain Model

The pipeline produces `NormalizedRecipe` objects that conform exactly to the FoodOS `Recipe` interface. No changes to the domain model are required.

### 2. RecommendationEngine

The existing `RecommendationEngine` in `foodos-app/lib/recommendation-engine.ts` queries recipes from Supabase and ranks them. Enriched recipes are automatically included in the candidate set with no code changes.

### 3. FeedRanker Edge Function

The existing `FeedRanker` edge function queries recipes for pantry matching and goal alignment. Enriched recipes with `macros` data are automatically scored correctly.

### 4. Recipe Detail Screen

The existing recipe detail screen (`foodos-app/app/recipe/[id].tsx`) displays recipe macros, ingredients, and steps. Enriched recipes render identically to user-created recipes.

### Distinguishing Ingested vs User-Created Recipes

Ingested recipes have `authorId: null`, while user-created recipes have a valid `authorId`. This allows filtering and attribution:

```typescript
// Query only user-created recipes
const userRecipes = await supabase
  .from('recipes')
  .select('*')
  .not('author_id', 'is', null);

// Query only ingested recipes
const ingestedRecipes = await supabase
  .from('recipes')
  .select('*')
  .is('author_id', null);
```

### Enrichment Status

Recipes have an `enrichment_status` field:
- `complete`: All ingredients matched to USDA data
- `partial`: Some ingredients matched, some unmatched
- `failed`: Zero ingredients matched

The app can filter by enrichment status:

```typescript
// Query only fully enriched recipes
const enrichedRecipes = await supabase
  .from('recipes')
  .select('*')
  .eq('enrichment_status', 'complete');
```

## Deployment

### Standalone Script

The pipeline is a standalone Node.js script that can be run manually or scheduled.

**Build for production**:
```bash
npm run build
```

**Run production build**:
```bash
npm start
```

### Cron Job

Schedule the pipeline to run periodically using cron or a task scheduler.

#### Basic Cron Configuration

**Run every Sunday at 2 AM**:
```bash
0 2 * * 0 cd /path/to/recipe-pipeline && npm run ingest >> /var/log/recipe-ingestion.log 2>&1
```

**Run daily at midnight**:
```bash
0 0 * * * cd /path/to/recipe-pipeline && npm run ingest >> /var/log/recipe-ingestion.log 2>&1
```

**Run every 6 hours**:
```bash
0 */6 * * * cd /path/to/recipe-pipeline && npm run ingest >> /var/log/recipe-ingestion.log 2>&1
```

#### Advanced Cron Script

For production deployments, use the provided cron script with error handling, logging, and notifications:

```bash
# Make the script executable
chmod +x examples/cron-job.sh

# Add to crontab
0 2 * * 0 /path/to/recipe-pipeline/examples/cron-job.sh >> /var/log/recipe-ingestion-cron.log 2>&1
```

**Features**:
- Lock file to prevent concurrent runs
- Timeout protection (1 hour max)
- Email notifications on success/failure
- Automatic log rotation (keeps last 30 days)
- Environment validation
- Detailed logging

**Configuration**:
```bash
# Set email for notifications (optional)
export NOTIFY_EMAIL="admin@example.com"
export NOTIFY_ON_SUCCESS=true
export NOTIFY_ON_FAILURE=true

# Run the script
./examples/cron-job.sh
```

See `examples/cron-job.sh` for the complete script.

### Docker

The pipeline can be containerized for portability and deployment to cloud platforms.

#### Build Docker Image

```bash
docker build -t recipe-pipeline .
```

The Dockerfile uses a multi-stage build for an optimized production image:
- Stage 1: Build TypeScript to JavaScript
- Stage 2: Production image with only runtime dependencies

#### Run with Docker

```bash
# Run with environment file
docker run --env-file .env recipe-pipeline

# Run with individual environment variables
docker run \
  -e USDA_API_KEY=your_key \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_KEY=your_key \
  recipe-pipeline
```

#### Run with Docker Compose

Docker Compose includes a local Supabase instance for testing:

```bash
# Start all services
docker-compose up

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f recipe-pipeline

# Stop all services
docker-compose down
```

**Configuration**:
- Edit `docker-compose.yml` to customize environment variables
- The pipeline service depends on `supabase-db` and will wait for it to be healthy
- Logs are persisted to `./logs` directory

#### Deploy to Cloud

**AWS ECS**:
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t recipe-pipeline .
docker tag recipe-pipeline:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/recipe-pipeline:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/recipe-pipeline:latest

# Create ECS task definition and schedule with EventBridge
```

**Google Cloud Run**:
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/<project-id>/recipe-pipeline
gcloud run deploy recipe-pipeline --image gcr.io/<project-id>/recipe-pipeline --platform managed
```

**Azure Container Instances**:
```bash
# Build and push to ACR
az acr build --registry <registry-name> --image recipe-pipeline .
az container create --resource-group <resource-group> --name recipe-pipeline --image <registry-name>.azurecr.io/recipe-pipeline
```

## Monitoring

### Structured Logging

All logs use structured JSON format for easy parsing and analysis:

```json
{
  "timestamp": "2025-01-15T14:30:00.000Z",
  "level": "info",
  "stage": "match",
  "message": "Ingredient matched to USDA",
  "metadata": {
    "ingredient": "chicken breast",
    "usdaFoodId": "171477",
    "confidence": "exact"
  }
}
```

### Key Metrics

Monitor these metrics for pipeline health:

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Job Duration** | Total time to complete ingestion | > 30 minutes |
| **Recipes Processed** | Number of recipes fetched and processed | < 50 (if limit is 100) |
| **Enrichment Success Rate** | % of recipes with `complete` or `partial` status | < 80% |
| **Unmatched Ingredients** | Number of ingredients with no USDA match | > 20% of total |
| **API Errors** | TheMealDB or USDA API failures | > 5% of requests |

### Log Events

Key events logged by the pipeline:

- `job_started`: Pipeline execution started
- `job_completed`: Pipeline execution completed
- `recipe_fetched`: Recipe fetched from TheMealDB
- `recipe_skipped`: Recipe skipped (already exists)
- `ingredient_parsed`: Ingredient parsed successfully
- `usda_match_found`: Ingredient matched to USDA
- `usda_match_failed`: Ingredient not matched to USDA
- `recipe_enriched`: Recipe enriched (complete/partial/failed)
- `recipe_stored`: Recipe stored in Supabase
- `error`: Error occurred

### Alert Recommendations

Set up alerts for:

1. **Job Failures**: Pipeline exits with non-zero status code
2. **High Error Rates**: > 10% of API requests fail
3. **Stale Data**: No successful job run in > 7 days
4. **Low Enrichment Rate**: < 70% of recipes fully enriched

**For detailed monitoring setup, observability platform integration, and troubleshooting with logs, see [docs/monitoring.md](docs/monitoring.md).**

## Troubleshooting

### Common Issues

#### 1. Missing Environment Variables

**Error**: `Missing required environment variable: USDA_API_KEY`

**Solution**: Ensure all required environment variables are set in `.env`:
```bash
cp .env.example .env
# Edit .env and add your credentials
```

#### 2. Database Connection Failure

**Error**: `Database connection failed` or `ECONNREFUSED`

**Solution**:
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Check that your Supabase project is active
- Ensure you're using the **service_role** key, not the anon key

#### 3. USDA API Rate Limiting

**Error**: `USDA API rate limit exceeded (429)`

**Solution**:
- The pipeline implements exponential backoff and retry logic
- Reduce `USDA_CONCURRENCY_LIMIT` in `.env` (default: 5)
- Wait a few minutes and retry

#### 4. Low Enrichment Success Rate

**Issue**: Many recipes have `enrichment_status: partial` or `failed`

**Solution**:
- Check the `unmatched_ingredients` array in the job summary
- Common unmatched ingredients: exotic spices, regional ingredients, brand names
- This is expected behavior - the pipeline gracefully degrades for unmatched ingredients
- Consider manually mapping common unmatched ingredients to USDA IDs

#### 5. Migration Fails

**Error**: `Migration failed: column already exists`

**Solution**:
- Migrations are idempotent and safe to rerun
- If a column already exists, the migration will skip it
- Check the migration logs for details

#### 6. TheMealDB API Errors

**Error**: `TheMealDB API returned 500` or `Network timeout`

**Solution**:
- TheMealDB is a free API and may have occasional downtime
- The pipeline logs the error and continues processing remaining recipes
- Retry the job after a few minutes

### Debug Mode

Enable debug logging for detailed output:

```bash
LOG_LEVEL=debug npm run ingest
```

This will log:
- Every API request and response
- Ingredient parsing details
- USDA matching strategy steps
- Cache hit/miss statistics

### Getting Help

If you encounter issues not covered here:

1. Check the logs for detailed error messages
2. Review the [design document](.kiro/specs/recipe-ingestion-pipeline/design.md)
3. Open an issue with:
   - Error message and stack trace
   - Environment configuration (redact sensitive values)
   - Steps to reproduce

## Development

### Project Structure

```
recipe-pipeline/
├── src/
│   ├── index.ts                 # Job orchestrator entry point
│   ├── clients/                 # External API clients
│   │   └── themealdb-client.ts
│   ├── parsers/                 # Ingredient parsing
│   │   └── ingredient-parser.ts
│   ├── matchers/                # USDA matching
│   │   └── usda-matcher.ts
│   ├── aggregators/             # Nutrition aggregation
│   │   └── macro-aggregator.ts
│   ├── normalizers/             # Recipe normalization
│   │   └── recipe-normalizer.ts
│   ├── storage/                 # Supabase storage
│   │   └── supabase-client.ts
│   ├── config/                  # Configuration validation
│   │   └── validator.ts
│   ├── migrations/              # Database migrations
│   │   └── run-migrations.ts
│   ├── types/                   # TypeScript types
│   │   └── domain.ts
│   └── utils/                   # Utilities
│       ├── logger.ts
│       └── retry.ts
├── examples/                    # Example configurations
│   └── cron-job.sh
├── docs/                        # Additional documentation
│   └── monitoring.md
├── .env.example                 # Example environment variables
├── Dockerfile                   # Docker configuration
├── docker-compose.yml           # Docker Compose configuration
├── package.json
├── tsconfig.json
└── README.md
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Style

- TypeScript with strict mode enabled
- ESLint for linting (if configured)
- Prettier for formatting (if configured)

### Contributing

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

ISC
