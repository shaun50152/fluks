import { randomUUID } from 'crypto';
import {
  TheMealDBRecipe,
  NormalizedRecipe,
  RecipeMacros,
  EnrichmentStatus,
  RecipeIngredient,
  RecipeStep,
  Macros
} from '../types/domain';

export class RecipeNormalizer {
  /**
   * Normalize a TheMealDB recipe into FoodOS Recipe domain model
   * 
   * @param tmdbRecipe - Raw recipe data from TheMealDB
   * @param macros - Aggregated macro nutrition data
   * @param unmatchedIngredients - List of ingredient names that couldn't be matched to USDA
   * @param enrichmentStatus - Status of the enrichment process
   * @returns Normalized recipe ready for storage in Supabase
   */
  public normalize(
    tmdbRecipe: TheMealDBRecipe,
    macros: RecipeMacros,
    unmatchedIngredients: string[],
    enrichmentStatus: EnrichmentStatus
  ): NormalizedRecipe {
    const now = new Date().toISOString();

    return {
      id: randomUUID(),
      source: 'themealdb',
      sourceRecipeId: tmdbRecipe.idMeal,
      title: tmdbRecipe.strMeal,
      description: null, // TheMealDB doesn't provide descriptions
      mediaUrl: tmdbRecipe.strMealThumb,
      mediaType: 'image' as const,
      category: tmdbRecipe.strCategory,
      cuisine: tmdbRecipe.strArea,
      instructions: tmdbRecipe.strInstructions,
      ingredients: this.extractIngredients(tmdbRecipe),
      steps: this.splitInstructions(tmdbRecipe.strInstructions),
      servings: null, // TheMealDB doesn't provide servings
      cookTime: 0, // TheMealDB doesn't provide cook time, default to 0
      tags: this.buildTags(tmdbRecipe),
      macros: this.convertMacros(macros.total),
      enrichmentStatus,
      unmatchedIngredients,
      authorId: null, // Always null for ingested recipes
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Extract ingredients from TheMealDB recipe format
   * TheMealDB stores ingredients as strIngredient1-20 and strMeasure1-20
   */
  private extractIngredients(tmdbRecipe: TheMealDBRecipe): RecipeIngredient[] {
    const ingredients: RecipeIngredient[] = [];

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

      ingredients.push({
        name: ingredient.trim(),
        amount: null, // Will be parsed by IngredientParser if needed
        unit: null,
        rawText
      });
    }

    return ingredients;
  }

  /**
   * Split instructions into ordered steps
   * TheMealDB provides instructions as a single text block
   */
  private splitInstructions(instructions: string): RecipeStep[] {
    if (!instructions || instructions.trim() === '') {
      return [];
    }

    // Split by common delimiters: newlines, numbered steps, or periods followed by capital letters
    const lines = instructions
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const steps: RecipeStep[] = [];
    let order = 1;

    // If we have multiple lines, process them
    if (lines.length > 1) {
      for (const line of lines) {
        // Remove leading step numbers like "1.", "Step 1:", etc.
        const cleanedLine = line.replace(/^(?:step\s*)?\d+[.):]\s*/i, '').trim();
        
        if (cleanedLine.length > 0) {
          steps.push({
            order,
            instruction: cleanedLine
          });
          order++;
        }
      }
      return steps;
    }

    // If only one line, try splitting by sentences (period followed by space and capital letter)
    const sentences = instructions
      .split(/\.(?=\s+[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length > 1) {
      sentences.forEach((sentence, index) => {
        const instruction = sentence.endsWith('.') ? sentence : `${sentence}.`;
        steps.push({
          order: index + 1,
          instruction
        });
      });
      return steps;
    }

    // Fallback: treat entire instruction as one step
    steps.push({
      order: 1,
      instruction: instructions.trim()
    });

    return steps;
  }

  /**
   * Build tags array from category and cuisine
   */
  private buildTags(tmdbRecipe: TheMealDBRecipe): string[] {
    const tags: string[] = [];

    if (tmdbRecipe.strCategory && tmdbRecipe.strCategory.trim() !== '') {
      tags.push(tmdbRecipe.strCategory.trim());
    }

    if (tmdbRecipe.strArea && tmdbRecipe.strArea.trim() !== '') {
      tags.push(tmdbRecipe.strArea.trim());
    }

    return tags;
  }

  /**
   * Convert RecipeMacros format to FoodOS Macros format
   * Maps proteinG/carbsG/fatG to protein/carbs/fat
   */
  private convertMacros(macros: Macros): { calories: number; protein: number; carbs: number; fat: number } {
    return {
      calories: macros.calories,
      protein: macros.proteinG,
      carbs: macros.carbsG,
      fat: macros.fatG
    };
  }
}
