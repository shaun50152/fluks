/**
 * Example usage of the Recipe Query Interface
 * 
 * This file demonstrates how to use the query interface to retrieve
 * enriched recipes from Supabase for the FoodOS mobile app.
 */

import { createQueryInterface } from './query-interface';

/**
 * Example: Basic recipe queries
 */
async function basicQueries() {
  // Initialize the query interface
  const queryInterface = createQueryInterface(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get all recipes (excluding failed enrichment)
  const allRecipes = await queryInterface.queryRecipes();
  console.log(`Found ${allRecipes.length} recipes`);

  // Get breakfast recipes
  const breakfastRecipes = await queryInterface.queryRecipes({
    category: 'Breakfast'
  });
  console.log(`Found ${breakfastRecipes.length} breakfast recipes`);

  // Get Italian recipes
  const italianRecipes = await queryInterface.queryRecipes({
    cuisine: 'Italian'
  });
  console.log(`Found ${italianRecipes.length} Italian recipes`);

  // Search for pasta recipes
  const pastaRecipes = await queryInterface.queryRecipes({
    titleSearch: 'pasta'
  });
  console.log(`Found ${pastaRecipes.length} pasta recipes`);
}

/**
 * Example: Macro-based filtering
 */
async function macroFiltering() {
  const queryInterface = createQueryInterface(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get high-protein, low-calorie recipes
  const highProteinRecipes = await queryInterface.queryRecipes({
    proteinMin: 30,
    caloriesMax: 500
  });
  console.log(`Found ${highProteinRecipes.length} high-protein recipes`);

  // Get low-carb recipes
  const lowCarbRecipes = await queryInterface.queryRecipes({
    carbsMax: 20
  });
  console.log(`Found ${lowCarbRecipes.length} low-carb recipes`);

  // Get recipes in a specific calorie range
  const moderateCalorieRecipes = await queryInterface.queryRecipes({
    caloriesMin: 300,
    caloriesMax: 600
  });
  console.log(`Found ${moderateCalorieRecipes.length} moderate-calorie recipes`);
}

/**
 * Example: Complex filtering
 */
async function complexFiltering() {
  const queryInterface = createQueryInterface(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get Italian breakfast recipes with specific macro requirements
  const recipes = await queryInterface.queryRecipes({
    category: 'Breakfast',
    cuisine: 'Italian',
    caloriesMin: 200,
    caloriesMax: 500,
    proteinMin: 20,
    carbsMax: 50
  });

  console.log(`Found ${recipes.length} matching recipes`);

  // Display recipe details
  for (const recipe of recipes) {
    console.log(`\n${recipe.title}`);
    console.log(`  Calories: ${recipe.macros.calories}`);
    console.log(`  Protein: ${recipe.macros.protein}g`);
    console.log(`  Carbs: ${recipe.macros.carbs}g`);
    console.log(`  Fat: ${recipe.macros.fat}g`);
    console.log(`  Cook Time: ${recipe.cookTime} minutes`);
  }
}

/**
 * Example: Pagination
 */
async function paginationExample() {
  const queryInterface = createQueryInterface(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get first page (20 recipes)
  const page1 = await queryInterface.queryRecipes(
    { category: 'Breakfast' },
    { page: 1, pageSize: 20 }
  );
  console.log(`Page 1: ${page1.length} recipes`);

  // Get second page
  const page2 = await queryInterface.queryRecipes(
    { category: 'Breakfast' },
    { page: 2, pageSize: 20 }
  );
  console.log(`Page 2: ${page2.length} recipes`);

  // Get smaller page size
  const smallPage = await queryInterface.queryRecipes(
    { category: 'Breakfast' },
    { page: 1, pageSize: 5 }
  );
  console.log(`Small page: ${smallPage.length} recipes`);
}

/**
 * Example: Enrichment status filtering
 */
async function enrichmentStatusFiltering() {
  const queryInterface = createQueryInterface(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Get only fully enriched recipes
  const completeRecipes = await queryInterface.queryRecipes({
    enrichmentStatus: 'complete'
  });
  console.log(`Found ${completeRecipes.length} fully enriched recipes`);

  // Get partially enriched recipes
  const partialRecipes = await queryInterface.queryRecipes({
    enrichmentStatus: 'partial'
  });
  console.log(`Found ${partialRecipes.length} partially enriched recipes`);

  // Get failed enrichment recipes (normally excluded)
  const failedRecipes = await queryInterface.queryRecipes({
    enrichmentStatus: 'failed'
  });
  console.log(`Found ${failedRecipes.length} failed enrichment recipes`);

  // Get pending recipes
  const pendingRecipes = await queryInterface.queryRecipes({
    enrichmentStatus: 'pending'
  });
  console.log(`Found ${pendingRecipes.length} pending recipes`);
}

/**
 * Example: Error handling
 */
async function errorHandling() {
  const queryInterface = createQueryInterface(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Invalid page number
    await queryInterface.queryRecipes({}, { page: 0 });
  } catch (error) {
    console.error('Error:', error);
  }

  try {
    // Invalid page size
    await queryInterface.queryRecipes({}, { pageSize: 101 });
  } catch (error) {
    console.error('Error:', error);
  }

  // Empty results (no error)
  const noResults = await queryInterface.queryRecipes({
    titleSearch: 'nonexistent-recipe-xyz'
  });
  console.log(`No results: ${noResults.length} recipes`); // Returns []
}

// Export examples for testing
export {
  basicQueries,
  macroFiltering,
  complexFiltering,
  paginationExample,
  enrichmentStatusFiltering,
  errorHandling
};
