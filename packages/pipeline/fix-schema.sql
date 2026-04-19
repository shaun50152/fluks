-- Fix Schema for Recipe Pipeline
-- This script adds all missing columns that the pipeline expects

-- Core recipe columns (if they don't exist)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients jsonb;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS steps jsonb;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings integer;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time integer;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS macros jsonb;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS author_id uuid;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Pipeline-specific columns
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_recipe_id text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS enrichment_status text 
  CHECK (enrichment_status IN ('pending', 'complete', 'partial', 'failed'));
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS unmatched_ingredients jsonb DEFAULT '[]';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine text;

-- Add unique constraint on source_recipe_id for deduplication
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
