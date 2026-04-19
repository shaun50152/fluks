/**
 * App Retrieval Layer Query Interface
 * 
 * Provides query functions for the FoodOS app to retrieve enriched recipes from Supabase.
 * Supports flexible filtering and pagination capabilities.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 13.1, 13.2, 13.3, 13.4
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Recipe filters for querying
 */
export interface RecipeFilters {
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

/**
 * Pagination parameters
 */
export interface Pagination {
  page?: number;
  pageSize?: number;
}

/**
 * Recipe format returned to the FoodOS app
 * Matches the Recipe interface in foodos-app/types/domain.ts
 */
export interface Recipe {
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

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  tags: string[];
}

export interface RecipeStep {
  order: number;
  instruction: string;
}

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Query interface for retrieving enriched recipes
 */
export class RecipeQueryInterface {
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
   * Query recipes with filters and pagination.
   * 
   * By default:
   * - Filters out recipes with enrichment_status 'failed'
   * - Returns 20 recipes per page
   * - Returns empty array when zero results (not error)
   * 
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 13.1, 13.2, 13.3, 13.4
   */
  async queryRecipes(
    filters: RecipeFilters = {},
    pagination: Pagination = {}
  ): Promise<Recipe[]> {
    try {
      const page = pagination.page ?? 1;
      const pageSize = pagination.pageSize ?? 20;

      if (page < 1) {
        throw new Error('Page must be >= 1');
      }

      if (pageSize < 1 || pageSize > 100) {
        throw new Error('Page size must be between 1 and 100');
      }

      // Start building the query
      let query = this.client
        .from('recipes')
        .select('*');

      // Apply filters
      if (filters.id) {
        query = query.eq('id', filters.id);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.cuisine) {
        query = query.eq('cuisine', filters.cuisine);
      }

      if (filters.titleSearch) {
        query = query.ilike('title', `%${filters.titleSearch}%`);
      }

      // Filter by enrichment status
      // Default: exclude 'failed' unless explicitly requested
      if (filters.enrichmentStatus !== undefined) {
        query = query.eq('enrichment_status', filters.enrichmentStatus);
      } else {
        query = query.neq('enrichment_status', 'failed');
      }

      // Apply macro range filters
      if (filters.caloriesMin !== undefined) {
        query = query.gte('macros->calories', filters.caloriesMin);
      }

      if (filters.caloriesMax !== undefined) {
        query = query.lte('macros->calories', filters.caloriesMax);
      }

      if (filters.proteinMin !== undefined) {
        query = query.gte('macros->protein', filters.proteinMin);
      }

      if (filters.proteinMax !== undefined) {
        query = query.lte('macros->protein', filters.proteinMax);
      }

      if (filters.carbsMin !== undefined) {
        query = query.gte('macros->carbs', filters.carbsMin);
      }

      if (filters.carbsMax !== undefined) {
        query = query.lte('macros->carbs', filters.carbsMax);
      }

      if (filters.fatMin !== undefined) {
        query = query.gte('macros->fat', filters.fatMin);
      }

      if (filters.fatMax !== undefined) {
        query = query.lte('macros->fat', filters.fatMax);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Execute query
      const { data, error } = await query;

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      // Return empty array if no results (Requirement 7.7)
      if (!data || data.length === 0) {
        return [];
      }

      // Transform database records to Recipe format
      return data.map(this.transformToRecipe);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query recipes: ${errorMessage}`);
    }
  }

  /**
   * Transform database record to Recipe format for the FoodOS app
   */
  private transformToRecipe(dbRecord: any): Recipe {
    return {
      id: dbRecord.id,
      title: dbRecord.title,
      description: dbRecord.description,
      ingredients: dbRecord.ingredients || [],
      steps: dbRecord.steps || [],
      macros: dbRecord.macros || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      tags: dbRecord.tags || [],
      cookTime: dbRecord.cook_time || 0,
      mediaUrl: dbRecord.image_url || dbRecord.media_url,
      mediaType: dbRecord.media_type || (dbRecord.image_url ? 'image' : null),
      authorId: dbRecord.author_id,
      createdAt: dbRecord.created_at
    };
  }
}

/**
 * Convenience function to create a query interface instance
 */
export function createQueryInterface(url: string, serviceKey: string): RecipeQueryInterface {
  return new RecipeQueryInterface(url, serviceKey);
}
