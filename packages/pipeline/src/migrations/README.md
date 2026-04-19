# Database Migrations

This directory contains SQL migration scripts for extending the Supabase `recipes` table to support the Recipe Ingestion Pipeline.

## Overview

The migration adds the following to the `recipes` table:
- **New columns**: `source`, `source_recipe_id`, `enrichment_status`, `unmatched_ingredients`, `category`, `cuisine`
- **Unique constraint**: `source_recipe_id` for deduplication
- **Indexes**: On `source_recipe_id`, `enrichment_status`, `category`, and `cuisine` for query performance

## Requirements

These migrations satisfy requirements 10.1-10.7 from the Recipe Ingestion Pipeline specification.

## Running Migrations

### Prerequisites

1. Set up your environment variables in `.env`:
   ```bash
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_KEY=your_supabase_service_key_here
   ```

2. Ensure you have access to your Supabase project dashboard or CLI.

### Method 1: Using the Migration Runner (Recommended)

Run the migration runner to display the SQL and instructions:

```bash
npm run migrate
```

This will:
- Validate your environment variables
- Display the SQL migration content
- Provide instructions for applying the migration via Supabase Dashboard, CLI, or psql

### Method 2: Supabase Dashboard (Manual)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `001_extend_recipes_table.sql`
5. Paste into the SQL Editor
6. Click **Run**

### Method 3: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link your project
supabase link --project-ref <your-project-ref>

# Run the migration
supabase db execute --file src/migrations/001_extend_recipes_table.sql
```

### Method 4: PostgreSQL CLI (psql)

```bash
# Get your connection string from Supabase dashboard
psql <connection-string> -f src/migrations/001_extend_recipes_table.sql
```

## Migration Files

### 001_extend_recipes_table.sql

Extends the existing `recipes` table with enrichment metadata columns and indexes.

**Columns Added:**
- `source` (text): External source of the recipe (e.g., "themealdb")
- `source_recipe_id` (text, unique): Unique identifier from the external source for deduplication
- `enrichment_status` (text): Status of nutrition enrichment (pending, complete, partial, failed)
- `unmatched_ingredients` (jsonb): Array of ingredient names that couldn't be matched to USDA data
- `category` (text): Recipe category (e.g., Breakfast, Dessert, Main Course)
- `cuisine` (text): Recipe cuisine (e.g., Italian, Mexican, Asian)

**Indexes Created:**
- `recipes_source_recipe_id_idx`: For fast deduplication lookups
- `recipes_enrichment_status_idx`: For filtering by enrichment status
- `recipes_category_idx`: For category-based queries
- `recipes_cuisine_idx`: For cuisine-based queries

**Constraints:**
- Unique constraint on `source_recipe_id` to prevent duplicate recipes from the same source
- Check constraint on `enrichment_status` to ensure valid values

## Idempotency

All migrations are designed to be idempotent, meaning they can be run multiple times without causing errors or data corruption:

- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ensures columns are only added if they don't exist
- `CREATE INDEX IF NOT EXISTS` ensures indexes are only created if they don't exist
- Unique constraint is added with a conditional check to avoid duplicate constraint errors

## Verification

After running the migration, verify the changes:

```sql
-- Check that new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recipes'
  AND column_name IN ('source', 'source_recipe_id', 'enrichment_status', 'unmatched_ingredients', 'category', 'cuisine');

-- Check that indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'recipes'
  AND indexname LIKE 'recipes_%_idx';

-- Check that unique constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'recipes_source_recipe_id_key';
```

## Rollback

If you need to rollback the migration (not recommended in production):

```sql
-- Remove indexes
DROP INDEX IF EXISTS recipes_source_recipe_id_idx;
DROP INDEX IF EXISTS recipes_enrichment_status_idx;
DROP INDEX IF EXISTS recipes_category_idx;
DROP INDEX IF EXISTS recipes_cuisine_idx;

-- Remove unique constraint
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_source_recipe_id_key;

-- Remove columns (WARNING: This will delete data!)
ALTER TABLE recipes DROP COLUMN IF EXISTS source;
ALTER TABLE recipes DROP COLUMN IF EXISTS source_recipe_id;
ALTER TABLE recipes DROP COLUMN IF EXISTS enrichment_status;
ALTER TABLE recipes DROP COLUMN IF EXISTS unmatched_ingredients;
ALTER TABLE recipes DROP COLUMN IF EXISTS category;
ALTER TABLE recipes DROP COLUMN IF EXISTS cuisine;
```

## Troubleshooting

### Error: "relation 'recipes' does not exist"

The `recipes` table hasn't been created yet. Run the base schema first:
```bash
psql <connection-string> -f foodos-app/supabase/schema.sql
```

### Error: "column already exists"

The migration has already been applied. This is safe to ignore if using `IF NOT EXISTS` clauses.

### Error: "permission denied"

Ensure you're using the Supabase service role key (not the anon key) or have sufficient database permissions.

## Next Steps

After applying the migration:

1. Verify the schema changes using the verification queries above
2. Configure your `.env` file with API keys (USDA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
3. Run the ingestion pipeline: `npm run ingest`
