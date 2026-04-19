# Monitoring and Observability Guide

This document provides detailed guidance on monitoring the Recipe Ingestion Pipeline, including structured logging, key metrics, alerting recommendations, and integration with observability platforms.

## Table of Contents

- [Structured Logging](#structured-logging)
- [Key Metrics](#key-metrics)
- [Log Events](#log-events)
- [Alert Recommendations](#alert-recommendations)
- [Observability Platform Integration](#observability-platform-integration)
- [Troubleshooting with Logs](#troubleshooting-with-logs)

## Structured Logging

The pipeline uses structured JSON logging for all events, making it easy to parse, query, and analyze logs with modern observability tools.

### Log Format

Every log entry follows this structure:

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

### Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp |
| `level` | string | Log level: `debug`, `info`, `warn`, `error` |
| `stage` | string | Pipeline stage: `fetch`, `parse`, `match`, `aggregate`, `normalize`, `store` |
| `message` | string | Human-readable log message |
| `metadata` | object | Additional context (optional) |

### Log Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `debug` | Detailed diagnostic information | Development, troubleshooting |
| `info` | General informational messages | Normal operation, progress updates |
| `warn` | Warning messages (non-critical) | Partial failures, degraded performance |
| `error` | Error messages (critical) | Failures, exceptions |

### Configuring Log Level

Set the `LOG_LEVEL` environment variable:

```bash
# Production (default)
LOG_LEVEL=info npm run ingest

# Development/Debugging
LOG_LEVEL=debug npm run ingest

# Minimal logging
LOG_LEVEL=warn npm run ingest
```

## Key Metrics

Monitor these metrics to ensure pipeline health and performance.

### 1. Job Duration

**Description**: Total time to complete a full ingestion job.

**Metric Name**: `job_duration_seconds`

**Target**: < 15 minutes for 100 recipes

**Alert Threshold**: > 30 minutes

**Example Log**:
```json
{
  "timestamp": "2025-01-15T14:45:00.000Z",
  "level": "info",
  "stage": "job",
  "message": "Job completed",
  "metadata": {
    "durationMs": 754000,
    "durationSeconds": 754
  }
}
```

**Query** (if using log aggregation):
```
stage="job" AND message="Job completed" | extract durationSeconds | avg(durationSeconds)
```

### 2. Recipes Processed

**Description**: Number of recipes fetched and processed per job run.

**Metric Name**: `recipes_processed_total`

**Target**: Close to `RECIPE_FETCH_LIMIT` (e.g., 95-100 if limit is 100)

**Alert Threshold**: < 50% of `RECIPE_FETCH_LIMIT`

**Example Log**:
```json
{
  "timestamp": "2025-01-15T14:45:00.000Z",
  "level": "info",
  "stage": "job",
  "message": "Job summary",
  "metadata": {
    "totalFetched": 100,
    "totalSkipped": 5,
    "totalEnriched": 85,
    "totalPartial": 10,
    "totalFailed": 5
  }
}
```

**Query**:
```
stage="job" AND message="Job summary" | extract totalFetched | sum(totalFetched)
```

### 3. Enrichment Success Rate

**Description**: Percentage of recipes with `complete` or `partial` enrichment status.

**Metric Name**: `enrichment_success_rate_percent`

**Calculation**: `(totalEnriched + totalPartial) / totalFetched * 100`

**Target**: > 90%

**Alert Threshold**: < 80%

**Example Calculation**:
```
(85 + 10) / 100 * 100 = 95%
```

**Query**:
```
stage="job" AND message="Job summary" 
| extract totalFetched, totalEnriched, totalPartial 
| eval success_rate = (totalEnriched + totalPartial) / totalFetched * 100
```

### 4. Unmatched Ingredients

**Description**: Number of unique ingredients that could not be matched to USDA data.

**Metric Name**: `unmatched_ingredients_count`

**Target**: < 10% of total ingredients

**Alert Threshold**: > 20% of total ingredients

**Example Log**:
```json
{
  "timestamp": "2025-01-15T14:45:00.000Z",
  "level": "warn",
  "stage": "match",
  "message": "Ingredient not matched",
  "metadata": {
    "ingredient": "saffron threads",
    "normalizedName": "saffron threads"
  }
}
```

**Query**:
```
stage="match" AND message="Ingredient not matched" 
| extract ingredient 
| count(distinct ingredient)
```

### 5. API Error Rate

**Description**: Percentage of API requests (TheMealDB, USDA) that fail.

**Metric Name**: `api_error_rate_percent`

**Target**: < 1%

**Alert Threshold**: > 5%

**Example Log**:
```json
{
  "timestamp": "2025-01-15T14:30:00.000Z",
  "level": "error",
  "stage": "fetch",
  "message": "TheMealDB API error",
  "metadata": {
    "statusCode": 500,
    "error": "Internal Server Error"
  }
}
```

**Query**:
```
(stage="fetch" OR stage="match") AND level="error" 
| count() as errors
| (stage="fetch" OR stage="match") | count() as total
| eval error_rate = errors / total * 100
```

### 6. USDA Match Confidence Distribution

**Description**: Distribution of USDA match confidence levels (exact, keyword, fallback, unmatched).

**Metric Name**: `usda_match_confidence_distribution`

**Target**: > 60% exact matches

**Example Log**:
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

**Query**:
```
stage="match" AND message="Ingredient matched to USDA" 
| extract confidence 
| count() by confidence
```

### 7. Cache Hit Rate

**Description**: Percentage of USDA lookups served from cache (within a single job run).

**Metric Name**: `usda_cache_hit_rate_percent`

**Target**: > 30% (depends on ingredient diversity)

**Example Log**:
```json
{
  "timestamp": "2025-01-15T14:45:00.000Z",
  "level": "info",
  "stage": "match",
  "message": "Cache statistics",
  "metadata": {
    "hits": 45,
    "misses": 105,
    "hitRate": 30.0
  }
}
```

**Query**:
```
stage="match" AND message="Cache statistics" 
| extract hits, misses 
| eval hit_rate = hits / (hits + misses) * 100
```

## Log Events

Key events logged by the pipeline:

### Job Lifecycle

| Event | Level | Stage | Description |
|-------|-------|-------|-------------|
| `Job started` | info | job | Pipeline execution started |
| `Job completed` | info | job | Pipeline execution completed successfully |
| `Job failed` | error | job | Pipeline execution failed |
| `Job summary` | info | job | Summary statistics at job completion |

### Recipe Processing

| Event | Level | Stage | Description |
|-------|-------|-------|-------------|
| `Recipe fetched` | info | fetch | Recipe fetched from TheMealDB |
| `Recipe skipped` | info | fetch | Recipe skipped (already exists) |
| `Recipe enriched` | info | normalize | Recipe enriched (complete/partial/failed) |
| `Recipe stored` | info | store | Recipe stored in Supabase |

### Ingredient Processing

| Event | Level | Stage | Description |
|-------|-------|-------|-------------|
| `Ingredient parsed` | debug | parse | Ingredient parsed successfully |
| `Ingredient matched to USDA` | info | match | Ingredient matched to USDA |
| `Ingredient not matched` | warn | match | Ingredient not matched to USDA |
| `USDA API error` | error | match | USDA API request failed |

### Errors

| Event | Level | Stage | Description |
|-------|-------|-------|-------------|
| `Configuration error` | error | config | Missing or invalid environment variable |
| `TheMealDB API error` | error | fetch | TheMealDB API request failed |
| `USDA API error` | error | match | USDA API request failed |
| `Database error` | error | store | Supabase database operation failed |
| `Parsing error` | warn | parse | Ingredient parsing failed |

## Alert Recommendations

Set up alerts for the following conditions to ensure pipeline health.

### Critical Alerts (Immediate Action Required)

#### 1. Job Failure

**Condition**: Pipeline exits with non-zero status code

**Query**:
```
stage="job" AND level="error" AND message="Job failed"
```

**Action**:
- Check error logs for root cause
- Verify environment configuration
- Check API status (TheMealDB, USDA, Supabase)
- Retry job manually if transient failure

#### 2. Database Connection Failure

**Condition**: Cannot connect to Supabase

**Query**:
```
stage="store" AND level="error" AND message CONTAINS "connection"
```

**Action**:
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check Supabase project status
- Verify network connectivity

#### 3. High API Error Rate

**Condition**: > 10% of API requests fail

**Query**:
```
(stage="fetch" OR stage="match") AND level="error" 
| count() as errors
| (stage="fetch" OR stage="match") | count() as total
| eval error_rate = errors / total * 100
| where error_rate > 10
```

**Action**:
- Check API status pages (TheMealDB, USDA)
- Verify API keys are valid
- Check for rate limiting (429 errors)
- Reduce `USDA_CONCURRENCY_LIMIT` if rate limited

### Warning Alerts (Monitor and Investigate)

#### 4. Low Enrichment Success Rate

**Condition**: < 80% of recipes fully or partially enriched

**Query**:
```
stage="job" AND message="Job summary" 
| extract totalFetched, totalEnriched, totalPartial 
| eval success_rate = (totalEnriched + totalPartial) / totalFetched * 100
| where success_rate < 80
```

**Action**:
- Review unmatched ingredients list
- Consider manually mapping common unmatched ingredients
- Check USDA API response quality

#### 5. Stale Data

**Condition**: No successful job run in > 7 days

**Query**:
```
stage="job" AND message="Job completed" 
| latest(timestamp) as last_run
| eval days_since = (now() - last_run) / 86400
| where days_since > 7
```

**Action**:
- Check cron job configuration
- Verify server/container is running
- Check for job failures in logs

#### 6. Long Job Duration

**Condition**: Job takes > 30 minutes

**Query**:
```
stage="job" AND message="Job completed" 
| extract durationSeconds 
| where durationSeconds > 1800
```

**Action**:
- Check API response times
- Verify `USDA_CONCURRENCY_LIMIT` is not too low
- Check for network latency issues
- Consider increasing `RECIPE_BATCH_SIZE`

### Informational Alerts (Track Trends)

#### 7. High Unmatched Ingredient Rate

**Condition**: > 20% of ingredients unmatched

**Query**:
```
stage="match" AND message="Ingredient not matched" 
| count() as unmatched
| stage="match" | count() as total
| eval unmatched_rate = unmatched / total * 100
| where unmatched_rate > 20
```

**Action**:
- Review unmatched ingredients list
- Update ingredient parser normalization rules
- Consider adding manual USDA mappings

## Observability Platform Integration

### Datadog

**Setup**:
1. Install Datadog agent on server/container
2. Configure log collection:
```yaml
logs:
  - type: file
    path: /var/log/recipe-ingestion.log
    service: recipe-pipeline
    source: nodejs
```

**Dashboard Widgets**:
- Job duration (timeseries)
- Recipes processed (counter)
- Enrichment success rate (gauge)
- API error rate (timeseries)
- Unmatched ingredients (top list)

### Splunk

**Setup**:
1. Install Splunk Universal Forwarder
2. Configure inputs.conf:
```ini
[monitor:///var/log/recipe-ingestion.log]
sourcetype = _json
index = recipe-pipeline
```

**Sample Queries**:
```spl
# Job duration over time
index=recipe-pipeline stage="job" message="Job completed" 
| timechart avg(durationSeconds) as avg_duration

# Enrichment success rate
index=recipe-pipeline stage="job" message="Job summary" 
| eval success_rate = (totalEnriched + totalPartial) / totalFetched * 100
| timechart avg(success_rate)

# Top unmatched ingredients
index=recipe-pipeline stage="match" message="Ingredient not matched" 
| top limit=20 ingredient
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

**Logstash Configuration**:
```ruby
input {
  file {
    path => "/var/log/recipe-ingestion.log"
    codec => json
  }
}

filter {
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "recipe-pipeline-%{+YYYY.MM.dd}"
  }
}
```

**Kibana Visualizations**:
- Line chart: Job duration over time
- Pie chart: Enrichment status distribution
- Data table: Recent unmatched ingredients
- Metric: Current enrichment success rate

### CloudWatch (AWS)

**Setup**:
1. Install CloudWatch agent
2. Configure log collection:
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/recipe-ingestion.log",
            "log_group_name": "/recipe-pipeline/ingestion",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

**CloudWatch Insights Queries**:
```
# Job duration
fields @timestamp, metadata.durationSeconds
| filter stage = "job" and message = "Job completed"
| stats avg(metadata.durationSeconds) by bin(5m)

# Error rate
fields @timestamp, level
| filter level = "error"
| stats count() as errors by bin(5m)
```

## Troubleshooting with Logs

### Common Scenarios

#### Scenario 1: Job Fails Immediately

**Symptoms**: Job exits within seconds with error

**Log Query**:
```
level="error" AND stage="config"
```

**Common Causes**:
- Missing environment variables
- Invalid API keys
- Database connection failure

**Resolution**:
- Check `.env` file
- Verify API keys are valid
- Test database connection

#### Scenario 2: Low Enrichment Rate

**Symptoms**: Many recipes have `enrichment_status: partial` or `failed`

**Log Query**:
```
stage="match" AND message="Ingredient not matched" 
| extract ingredient 
| count() by ingredient 
| sort count desc
```

**Common Causes**:
- Exotic or regional ingredients
- Brand names in ingredient strings
- Poor ingredient normalization

**Resolution**:
- Review top unmatched ingredients
- Update parser normalization rules
- Add manual USDA mappings

#### Scenario 3: Slow Job Execution

**Symptoms**: Job takes > 30 minutes

**Log Query**:
```
stage="match" AND level="error" AND message CONTAINS "timeout"
```

**Common Causes**:
- USDA API rate limiting
- Network latency
- Low concurrency limit

**Resolution**:
- Check for 429 rate limit errors
- Increase `USDA_CONCURRENCY_LIMIT` (if not rate limited)
- Check network connectivity

#### Scenario 4: Duplicate Recipes

**Symptoms**: Same recipe appears multiple times

**Log Query**:
```
stage="store" AND message="Recipe stored" 
| extract metadata.sourceRecipeId 
| count() by metadata.sourceRecipeId 
| where count > 1
```

**Common Causes**:
- Unique constraint not enforced
- Migration not run
- Database schema mismatch

**Resolution**:
- Run migrations: `npm run migrate`
- Verify `source_recipe_id` unique constraint exists
- Check database schema

### Debug Mode

Enable debug logging for detailed diagnostic information:

```bash
LOG_LEVEL=debug npm run ingest
```

**Debug logs include**:
- Every API request and response
- Ingredient parsing details (raw text, normalized name, amount, unit)
- USDA matching strategy steps (exact, keyword, fallback)
- Cache hit/miss for each ingredient
- Database query details

**Example debug log**:
```json
{
  "timestamp": "2025-01-15T14:30:00.000Z",
  "level": "debug",
  "stage": "parse",
  "message": "Ingredient parsed",
  "metadata": {
    "rawText": "2 cups fresh spinach",
    "normalizedName": "spinach",
    "amount": 2,
    "unit": "cups"
  }
}
```

## Best Practices

1. **Centralize Logs**: Use a log aggregation platform (Datadog, Splunk, ELK) for easy querying and analysis
2. **Set Up Alerts**: Configure alerts for critical conditions (job failures, high error rates)
3. **Monitor Trends**: Track metrics over time to identify degradation
4. **Retain Logs**: Keep logs for at least 30 days for historical analysis
5. **Use Structured Logging**: Always log in JSON format for easy parsing
6. **Include Context**: Add relevant metadata to logs (recipe IDs, ingredient names, error codes)
7. **Test Alerts**: Regularly test alert configurations to ensure they fire correctly
8. **Document Runbooks**: Create runbooks for common alert scenarios

## Additional Resources

- [Pipeline Design Document](../.kiro/specs/recipe-ingestion-pipeline/design.md)
- [Requirements Document](../.kiro/specs/recipe-ingestion-pipeline/requirements.md)
- [README](../README.md)
- [Troubleshooting Guide](../README.md#troubleshooting)
