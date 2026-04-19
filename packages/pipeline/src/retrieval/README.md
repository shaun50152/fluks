# Recipe Retrieval Layer

The retrieval layer provides a query interface for the FoodOS mobile app to retrieve enriched recipes from Supabase.

## Overview

The `RecipeQueryInterface` class provides flexible filtering and pagination capabilities for querying enriched recipes. It integrates seamlessly with the existing FoodOS domain model and supports:

- Filtering by id, category, cuisine, title search, enrichment status, and macro ranges
- Pagination with configurable page size
- Automatic filtering of failed enrichment recipes
- Empty array returns for zero results (no errors)

## Usage

### Basic Setup

```typescript
import { createQueryInterface } from './retrieval';

const queryInterface = createQueryInterface(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

### Query Examples

#### Get all recipes (excluding failed enrichment)

```typescript
const recipes = await queryInterface.queryRecipes();
```

#### Filter by category

```typescript
const breakfastRecipes = await queryInterface.queryRecipes({
  category: 'Breakfast'
});
```

#### Filter by cuisine

```typescript
const italianRecipes = await queryInterface.queryRecipes({
  cuisine: 'Italian'
});
```

#### Search by title

```typescript
const pastaRecipes = await queryInterface.queryRecipes({
  titleSearch: 'pasta'
});
```

#### Filter by macro ranges

```typescript
const highProteinRecipes = await queryInterface.queryRecipes({
  proteinMin: 30,
  caloriesMax: 500
});
```

#### Combine multiple filters

```typescript
const recipes = await queryInterface.queryRecipes({
  category: 'Breakfast',
  cuisine: 'Italian',
  caloriesMin: 200,
  caloriesMax: 500,
  proteinMin: 20
});
```

#### Include failed enrichment recipes

```typescript
const failedRecipes = await queryInterface.queryRecipes({
  enrichmentStatus: 'failed'
});
```

#### Custom pagination

```typescript
const page2 = await queryInterface.queryRecipes(
  { category: 'Breakfast' },
  { page: 2, pageSize: 10 }
);
```

## API Reference

### RecipeFilters

```typescript
interface RecipeFilters {
  id?: string;
  category?: string;
  cuisine?: string;
  titleSearch?: string;
  enrichmentStatus?: 'pending' | 'complete' | 'partial' | 'failed';
  caloriesMin?: number;
  caloriesMax?: number;
  proteinMin?: number;
  proteinMax?: number;
  carbsMin?: number;
  carbsMax?: number;
  fatMin?: number;
  fatMax?: number;
}
```

### Pagination

```typescript
interface Pagination {
  page?: number;      // Default: 1
  pageSize?: number;  // Default: 20, Max: 100
}
```

### Recipe

The returned `Recipe` interface matches the FoodOS domain model:

```typescript
interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  macros: Macros;
  tags: string[];
  cookTime: number;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  authorId: string | null;
  createdAt: string;
}
```

## Default Behavior

- **Enrichment Status**: By default, recipes with `enrichment_status: 'failed'` are excluded from results. To include them, explicitly set `enrichmentStatus: 'failed'` in the filters.
- **Pagination**: Default page size is 20 recipes. Maximum page size is 100.
- **Empty Results**: Returns an empty array `[]` when no recipes match the filters (does not throw an error).

## Requirements Satisfied

This implementation satisfies the following requirements:

- **7.1**: Query interface for fetching recipes by id, category, cuisine, title search, and enrichment_status
- **7.2**: Returns recipes in FoodOS Recipe domain model format
- **7.3**: Includes image_url, macros, instructions, and ingredients in every response
- **7.4**: Filters out enrichment_status 'failed' by default
- **7.5**: Supports pagination with default page size of 20
- **7.6**: Returns results within 500ms under normal database load (depends on Supabase performance)
- **7.7**: Returns empty array when zero results (not error)
- **13.1**: Supports filtering by category
- **13.2**: Supports filtering by cuisine
- **13.3**: Supports filtering by macro ranges
- **13.4**: Multiple filters use AND logic

## Testing

Run the tests:

```bash
npm test -- src/retrieval/
```

The test suite includes:
- Unit tests for all filter types
- Pagination validation
- Error handling
- Data transformation
- Integration tests for interface structure
