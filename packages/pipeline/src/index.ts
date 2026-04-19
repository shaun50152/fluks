/**
 * Recipe Ingestion Pipeline - Job Orchestrator
 * 
 * Entry point for the recipe ingestion and enrichment pipeline.
 * Orchestrates the entire fetch-parse-enrich-store workflow.
 * 
 * Requirements: 1.3, 1.4, 1.5, 1.7, 6.1, 6.2, 6.3, 6.4, 8.1, 8.4, 8.7, 12.1, 12.2, 12.4
 */

import { config } from 'dotenv';
import pLimit from 'p-limit';
import { validateConfig, PipelineConfig } from './config/validator';
import { TheMealDBClient } from './clients/themealdb-client';
import { IngredientParser } from './parsers/ingredient-parser';
import { USDAMatcher } from './matchers/usda-matcher';
import { MacroAggregator } from './aggregators/macro-aggregator';
import { RecipeNormalizer } from './normalizers/recipe-normalizer';
import { SupabaseStorageClient } from './storage/supabase-client';
import { logger } from './utils/logger';
import { JobSummary, TheMealDBRecipe, ParsedIngredient, MatchResult, EnrichmentStatus } from './types/domain';

// Load environment variables
config();

/**
 * Main job orchestrator function
 * 
 * Executes the complete ingestion pipeline:
 * 1. Validate configuration
 * 2. Initialize all modules
 * 3. Query existing recipes for deduplication
 * 4. Fetch recipes from TheMealDB
 * 5. For each recipe: parse → match → aggregate → normalize → upsert
 * 6. Log summary statistics
 * 
 * @param config - Pipeline configuration
 * @returns Job summary with statistics
 */
export async function runIngestionJob(config: PipelineConfig): Promise<JobSummary> {
  const startTime = Date.now();
  
  logger.info('job', 'Starting recipe ingestion job', {
    fetchLimit: config.recipeFetchLimit,
    batchSize: config.recipeBatchSize,
    refreshMode: config.refreshMode,
    usdaConcurrencyLimit: config.usdaConcurrencyLimit
  });

  // Initialize summary
  const summary: JobSummary = {
    totalFetched: 0,
    totalSkipped: 0,
    totalEnriched: 0,
    totalPartial: 0,
    totalFailed: 0,
    unmatchedIngredients: [],
    errors: [],
    durationMs: 0
  };

  try {
    // Initialize all modules
    logger.info('job', 'Initializing pipeline modules');
    
    const themealdbClient = new TheMealDBClient();
    const ingredientParser = new IngredientParser();
    const usdaMatcher = new USDAMatcher(config.usdaApiKey);
    const macroAggregator = new MacroAggregator();
    const recipeNormalizer = new RecipeNormalizer();
    const supabaseClient = new SupabaseStorageClient(config.supabaseUrl, config.supabaseServiceKey);

    // Query existing source_recipe_id values for deduplication or refresh
    let recipesToProcess: TheMealDBRecipe[];
    
    if (config.refreshMode) {
      // In refresh mode, query stale recipes and re-fetch them
      logger.info('job', `Refresh mode enabled - querying stale recipes (threshold: ${config.stalenessThresholdDays} days)`);
      const staleRecipeIds = await supabaseClient.getStaleRecipeIds(config.stalenessThresholdDays);
      logger.info('job', `Found ${staleRecipeIds.size} stale recipes to refresh`);

      if (staleRecipeIds.size === 0) {
        logger.info('job', 'No stale recipes found - job complete');
        summary.durationMs = Date.now() - startTime;
        return summary;
      }

      // Fetch stale recipes by ID from TheMealDB
      logger.info('job', `Fetching ${staleRecipeIds.size} stale recipes from TheMealDB`);
      const fetchedRecipes: TheMealDBRecipe[] = [];
      
      for (const sourceId of staleRecipeIds) {
        try {
          const recipe = await themealdbClient.fetchRecipeById(sourceId);
          if (recipe) {
            fetchedRecipes.push(recipe);
          } else {
            logger.warn('job', `Recipe ${sourceId} not found in TheMealDB - may have been deleted`);
          }
        } catch (error) {
          logger.error('job', `Failed to fetch recipe ${sourceId} from TheMealDB`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      summary.totalFetched = fetchedRecipes.length;
      recipesToProcess = fetchedRecipes;
      logger.info('job', `Successfully fetched ${fetchedRecipes.length} stale recipes for refresh`);
    } else {
      // Normal mode: fetch new recipes and skip existing ones
      logger.info('job', 'Querying existing recipes for deduplication');
      const existingSourceIds = await supabaseClient.getExistingSourceIds();
      logger.info('job', `Found ${existingSourceIds.size} existing recipes in database`);

      // Fetch recipes from TheMealDB
      logger.info('job', `Fetching up to ${config.recipeFetchLimit} recipes from TheMealDB`);
      const fetchedRecipes = await themealdbClient.fetchRecipes(config.recipeFetchLimit);
      summary.totalFetched = fetchedRecipes.length;
      logger.info('job', `Fetched ${fetchedRecipes.length} recipes from TheMealDB`);

      // Filter out recipes that already exist
      recipesToProcess = fetchedRecipes.filter(recipe => !existingSourceIds.has(recipe.idMeal));
      summary.totalSkipped = fetchedRecipes.length - recipesToProcess.length;
      logger.info('job', `Skipping ${summary.totalSkipped} existing recipes, processing ${recipesToProcess.length} new recipes`);
    }

    // Process recipes in batches
    const batches = chunkArray(recipesToProcess, config.recipeBatchSize);
    logger.info('job', `Processing ${recipesToProcess.length} recipes in ${batches.length} batches of ${config.recipeBatchSize}`);

    // Create concurrency limiter for USDA API calls
    const usdaLimit = pLimit(config.usdaConcurrencyLimit);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger.info('job', `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} recipes)`);

      // Process each recipe in the batch
      for (const tmdbRecipe of batch) {
        try {
          await processRecipe(
            tmdbRecipe,
            ingredientParser,
            usdaMatcher,
            macroAggregator,
            recipeNormalizer,
            supabaseClient,
            usdaLimit,
            summary
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('job', `Failed to process recipe ${tmdbRecipe.idMeal}: ${tmdbRecipe.strMeal}`, {
            recipeId: tmdbRecipe.idMeal,
            error: errorMessage
          });
          summary.errors.push(`Recipe ${tmdbRecipe.idMeal}: ${errorMessage}`);
          summary.totalFailed++;
        }
      }
    }

    // Log USDA cache statistics
    const cacheStats = usdaMatcher.getCacheStats();
    logger.info('job', 'USDA matcher cache statistics', {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hits + cacheStats.misses > 0 
        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
        : 'N/A'
    });

    // Calculate duration
    summary.durationMs = Date.now() - startTime;

    // Log final summary
    logger.info('job', 'Recipe ingestion job completed', {
      mode: config.refreshMode ? 'refresh' : 'normal',
      totalFetched: summary.totalFetched,
      totalSkipped: summary.totalSkipped,
      totalEnriched: summary.totalEnriched,
      totalPartial: summary.totalPartial,
      totalFailed: summary.totalFailed,
      totalRefreshed: config.refreshMode ? summary.totalEnriched + summary.totalPartial : 0,
      uniqueUnmatchedIngredients: summary.unmatchedIngredients.length,
      errorCount: summary.errors.length,
      durationMs: summary.durationMs,
      durationSeconds: (summary.durationMs / 1000).toFixed(2)
    });

    if (summary.unmatchedIngredients.length > 0) {
      logger.info('job', `Unmatched ingredients (${summary.unmatchedIngredients.length}):`, {
        ingredients: summary.unmatchedIngredients.slice(0, 20) // Log first 20
      });
    }

    if (summary.errors.length > 0) {
      logger.warn('job', `Encountered ${summary.errors.length} errors during processing`, {
        errors: summary.errors.slice(0, 10) // Log first 10
      });
    }

    return summary;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('job', 'Unrecoverable error in ingestion job', {
      error: errorMessage,
      durationMs: Date.now() - startTime
    });
    
    summary.durationMs = Date.now() - startTime;
    summary.errors.push(`Unrecoverable error: ${errorMessage}`);
    
    throw error;
  }
}

/**
 * Process a single recipe through the entire pipeline
 */
async function processRecipe(
  tmdbRecipe: TheMealDBRecipe,
  ingredientParser: IngredientParser,
  usdaMatcher: USDAMatcher,
  macroAggregator: MacroAggregator,
  recipeNormalizer: RecipeNormalizer,
  supabaseClient: SupabaseStorageClient,
  usdaLimit: ReturnType<typeof pLimit>,
  summary: JobSummary
): Promise<void> {
  logger.info('job', `Processing recipe: ${tmdbRecipe.strMeal}`, {
    recipeId: tmdbRecipe.idMeal,
    category: tmdbRecipe.strCategory,
    cuisine: tmdbRecipe.strArea
  });

  // Extract and parse ingredients
  const rawIngredients = extractRawIngredients(tmdbRecipe);
  logger.debug('job', `Extracted ${rawIngredients.length} ingredients`, {
    recipeId: tmdbRecipe.idMeal
  });

  const parsedIngredients: ParsedIngredient[] = [];
  for (const rawText of rawIngredients) {
    try {
      const parsed = ingredientParser.parse(rawText);
      parsedIngredients.push(parsed);
    } catch (error) {
      logger.warn('parse', `Failed to parse ingredient: "${rawText}"`, {
        recipeId: tmdbRecipe.idMeal,
        error: error instanceof Error ? error.message : String(error)
      });
      // Skip invalid ingredients
    }
  }

  logger.debug('job', `Parsed ${parsedIngredients.length} ingredients`, {
    recipeId: tmdbRecipe.idMeal
  });

  // Match ingredients with USDA (with concurrency control)
  const matchResults: MatchResult[] = await Promise.all(
    parsedIngredients.map(ingredient => 
      usdaLimit(() => usdaMatcher.match(ingredient))
    )
  );

  // Collect unmatched ingredients
  const unmatchedInThisRecipe: string[] = [];
  for (const match of matchResults) {
    if (match.matchConfidence === 'unmatched') {
      unmatchedInThisRecipe.push(match.ingredient.normalizedName);
      
      // Add to global unmatched list if not already present
      if (!summary.unmatchedIngredients.includes(match.ingredient.normalizedName)) {
        summary.unmatchedIngredients.push(match.ingredient.normalizedName);
      }
    }
  }

  logger.debug('job', `Matched ${matchResults.length - unmatchedInThisRecipe.length}/${matchResults.length} ingredients`, {
    recipeId: tmdbRecipe.idMeal,
    unmatched: unmatchedInThisRecipe.length
  });

  // Aggregate macros
  const macros = macroAggregator.aggregate(matchResults, null); // TheMealDB doesn't provide servings

  // Determine enrichment status
  let enrichmentStatus: EnrichmentStatus;
  if (macros.matchedIngredientCount === 0) {
    enrichmentStatus = 'failed';
    summary.totalFailed++;
  } else if (macros.matchedIngredientCount < macros.totalIngredientCount) {
    enrichmentStatus = 'partial';
    summary.totalPartial++;
  } else {
    enrichmentStatus = 'complete';
    summary.totalEnriched++;
  }

  logger.info('job', `Recipe enrichment ${enrichmentStatus}`, {
    recipeId: tmdbRecipe.idMeal,
    recipeName: tmdbRecipe.strMeal,
    enrichmentStatus,
    matchedIngredients: macros.matchedIngredientCount,
    totalIngredients: macros.totalIngredientCount,
    calories: macros.total.calories
  });

  // Normalize recipe
  const normalizedRecipe = recipeNormalizer.normalize(
    tmdbRecipe,
    macros,
    unmatchedInThisRecipe,
    enrichmentStatus
  );

  // Upsert to Supabase
  await supabaseClient.upsertRecipe(normalizedRecipe);
  
  logger.info('store', `Successfully stored recipe: ${tmdbRecipe.strMeal}`, {
    recipeId: tmdbRecipe.idMeal,
    normalizedId: normalizedRecipe.id,
    enrichmentStatus
  });
}

/**
 * Extract raw ingredient strings from TheMealDB recipe
 */
function extractRawIngredients(tmdbRecipe: TheMealDBRecipe): string[] {
  const ingredients: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const ingredientKey = `strIngredient${i}` as keyof TheMealDBRecipe;
    const measureKey = `strMeasure${i}` as keyof TheMealDBRecipe;
    
    const ingredient = tmdbRecipe[ingredientKey];
    const measure = tmdbRecipe[measureKey];

    // Skip empty ingredients
    if (!ingredient || ingredient.trim() === '') {
      continue;
    }

    const rawText = measure && measure.trim() !== '' 
      ? `${measure.trim()} ${ingredient.trim()}`
      : ingredient.trim();

    ingredients.push(rawText);
  }

  return ingredients;
}

/**
 * Split array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * CLI entry point
 * Runs when executed directly (not imported as a module)
 */
if (require.main === module) {
  (async () => {
    try {
      // Validate configuration
      logger.info('config', 'Validating environment configuration');
      const pipelineConfig = validateConfig(process.env);
      logger.setLevel(pipelineConfig.logLevel);
      logger.info('config', 'Configuration validated successfully', {
        fetchLimit: pipelineConfig.recipeFetchLimit,
        batchSize: pipelineConfig.recipeBatchSize,
        logLevel: pipelineConfig.logLevel
      });

      // Run ingestion job
      const summary = await runIngestionJob(pipelineConfig);

      // Exit with appropriate status code
      if (summary.errors.length > 0 && summary.totalEnriched === 0 && summary.totalPartial === 0) {
        // Complete failure - no recipes enriched
        logger.error('job', 'Job failed - no recipes were successfully enriched');
        process.exit(1);
      } else if (summary.errors.length > 0) {
        // Partial success - some errors but some recipes enriched
        logger.warn('job', 'Job completed with errors');
        process.exit(0); // Still exit 0 since some recipes were processed
      } else {
        // Complete success
        logger.info('job', 'Job completed successfully');
        process.exit(0);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('job', 'Fatal error - job terminated', {
        error: errorMessage
      });
      process.exit(1);
    }
  })();
}
