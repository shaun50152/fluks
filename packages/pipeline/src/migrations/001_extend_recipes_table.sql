-- Migration: Extend recipes table for Recipe Ingestion Pipeline
-- Description: Add columns and indexes to support enrichment metadata and deduplication
-- Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7

-- Add new columns to existing recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_recipe_id text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS enrichment_status text 
  CHECK (enrichment_status IN ('pending', 'complete', 'partial', 'failed'));
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unmatched_ingredients jsonb DEFAULT '[]';

-- Add category and cuisine columns if they don't exist (needed for TheMealDB integration)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine text;

-- Add unique constraint on source_recipe_id for deduplication
-- Use DO block to handle constraint existence check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'recipes_source_recipe_id_key'
  ) THEN
    ALTER TABLE recipes ADD CONSTRAINT recipes_source_recipe_id_key UNIQUE (source_recipe_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS recipes_source_recipe_id_idx ON recipes(source_recipe_id);
CREATE INDEX IF NOT EXISTS recipes_enrichment_status_idx ON recipes(enrichment_status);
CREATE INDEX IF NOT EXISTS recipes_category_idx ON recipes(category);
CREATE INDEX IF NOT EXISTS recipes_cuisine_idx ON recipes(cuisine);

-- Add comments for documentation
COMMENT ON COLUMN recipes.source IS 'External source of the recipe (e.g., themealdb)';
COMMENT ON COLUMN recipes.source_recipe_id IS 'Unique identifier from the external source for deduplication';
COMMENT ON COLUMN recipes.enrichment_status IS 'Status of nutrition enrichment: pending, complete, partial, or failed';
COMMENT ON COLUMN recipes.unmatched_ingredients IS 'Array of ingredient names that could not be matched to USDA data';
COMMENT ON COLUMN recipes.category IS 'Recipe category (e.g., Breakfast, Dessert, Main Course)';
COMMENT ON COLUMN recipes.cuisine IS 'Recipe cuisine (e.g., Italian, Mexican, Asian)';
