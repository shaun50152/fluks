/**
 * Supabase Storage Client
 * 
 * Handles upsert operations for normalized recipes into Supabase.
 * Implements idempotent upserts using source_recipe_id unique constraint.
 * 
 * Requirements: 5.7, 6.1, 6.2, 6.3, 6.4, 10.7
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NormalizedRecipe } from '../types/domain';
import * as fs from 'fs';
import * as path from 'path';

export class SupabaseStorageClient {
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    if (!url || !serviceKey) {
      throw new Error('Supabase URL and service key are required');
    }

    this.client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Upserts a normalized recipe into the recipes table.
   * Uses INSERT ... ON CONFLICT (source_recipe_id) DO UPDATE for idempotent upserts.
   * Preserves created_at timestamp on updates, updates updated_at on every upsert.
   * 
   * Requirements: 5.3, 6.1, 6.2, 6.3, 6.4
   */
  async upsertRecipe(recipe: NormalizedRecipe): Promise<void> {
    try {
      // Transform NormalizedRecipe to database format
      const dbRecord = {
        id: recipe.id,
        source: recipe.source,
        source_recipe_id: recipe.sourceRecipeId,
        title: recipe.title,
        description: recipe.description,
        media_url: recipe.mediaUrl,
        media_type: recipe.mediaType,
        category: recipe.category,
        cuisine: recipe.cuisine,
        instructions: recipe.instructions,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        servings: recipe.servings,
        cook_time: recipe.cookTime,
        tags: recipe.tags,
        macros: recipe.macros,
        enrichment_status: recipe.enrichmentStatus,
        unmatched_ingredients: recipe.unmatchedIngredients,
        author_id: recipe.authorId,
        updated_at: new Date().toISOString()
      };

      // Use upsert to handle INSERT ... ON CONFLICT UPDATE
      const { error } = await this.client
        .from('recipes')
        .upsert(dbRecord, {
          onConflict: 'source_recipe_id',
          ignoreDuplicates: false
        });

      if (error) {
        throw new Error(`Failed to upsert recipe ${recipe.sourceRecipeId}: ${error.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Supabase upsert failed: ${errorMessage}`);
    }
  }

  /**
   * Retrieves all existing source_recipe_id values for deduplication.
   * Used by the fetch stage to skip recipes that have already been ingested.
   * 
   * Requirements: 1.4
   */
  async getExistingSourceIds(): Promise<Set<string>> {
    try {
      const { data, error } = await this.client
        .from('recipes')
        .select('source_recipe_id')
        .not('source_recipe_id', 'is', null);

      if (error) {
        throw new Error(`Failed to fetch existing source IDs: ${error.message}`);
      }

      const sourceIds = new Set<string>();
      if (data) {
        for (const row of data) {
          if (row.source_recipe_id) {
            sourceIds.add(row.source_recipe_id);
          }
        }
      }

      return sourceIds;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get existing source IDs: ${errorMessage}`);
    }
  }

  /**
   * Retrieves source_recipe_id values for stale recipes that need refreshing.
   * A recipe is considered stale if its updated_at timestamp is older than the threshold.
   * Excludes recipes with is_manual: true (user-edited recipes).
   * 
   * Requirements: 15.1, 15.2, 15.5
   * 
   * @param stalenessThresholdDays - Number of days before a recipe is considered stale
   * @returns Set of source_recipe_id values for stale recipes
   */
  async getStaleRecipeIds(stalenessThresholdDays: number): Promise<Set<string>> {
    try {
      // Calculate the cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - stalenessThresholdDays);
      const cutoffIso = cutoffDate.toISOString();

      // Query recipes with updated_at older than threshold
      // Exclude recipes with is_manual: true
      const { data, error } = await this.client
        .from('recipes')
        .select('source_recipe_id')
        .not('source_recipe_id', 'is', null)
        .lt('updated_at', cutoffIso)
        .or('is_manual.is.null,is_manual.eq.false');

      if (error) {
        throw new Error(`Failed to fetch stale recipe IDs: ${error.message}`);
      }

      const staleIds = new Set<string>();
      if (data) {
        for (const row of data) {
          if (row.source_recipe_id) {
            staleIds.add(row.source_recipe_id);
          }
        }
      }

      return staleIds;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stale recipe IDs: ${errorMessage}`);
    }
  }

  /**
   * Applies database migrations to extend the recipes table.
   * Reads and prints migration SQL files for manual execution.
   * 
   * Note: The Supabase JS client does not support direct SQL execution.
   * This method prints instructions for applying migrations via Supabase Dashboard,
   * Supabase CLI, or psql.
   * 
   * Requirements: 10.7
   */
  async applyMigrations(): Promise<void> {
    try {
      const migrationFile = '001_extend_recipes_table.sql';
      const migrationPath = path.join(__dirname, '../migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationFile}`);
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8');

      console.log('\n' + '='.repeat(80));
      console.log(`Migration: ${migrationFile}`);
      console.log('='.repeat(80));
      console.log('\nTo apply this migration, use one of the following methods:\n');

      console.log('METHOD 1: Supabase Dashboard (Recommended)');
      console.log('  1. Go to your Supabase project dashboard');
      console.log('  2. Navigate to SQL Editor');
      console.log('  3. Create a new query');
      console.log('  4. Copy and paste the SQL below');
      console.log('  5. Click "Run"\n');

      console.log('METHOD 2: Supabase CLI');
      console.log('  1. Install: npm install -g supabase');
      console.log('  2. Link: supabase link --project-ref <your-project-ref>');
      console.log(`  3. Run: supabase db execute --file src/migrations/${migrationFile}\n`);

      console.log('METHOD 3: psql (PostgreSQL CLI)');
      console.log('  1. Get connection string from Supabase dashboard');
      console.log(`  2. Run: psql <connection-string> -f src/migrations/${migrationFile}\n`);

      console.log('='.repeat(80));
      console.log('SQL MIGRATION CONTENT:');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80) + '\n');

      console.log('Note: The Supabase JS client does not support direct SQL execution.');
      console.log('Please use one of the methods above to apply the migration.\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to apply migrations: ${errorMessage}`);
    }
  }
}
