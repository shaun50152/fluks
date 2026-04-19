import { MatchResult, RecipeMacros, Macros } from '../types/domain';

export class MacroAggregator {
  public aggregate(matchResults: MatchResult[], servings: number | null): RecipeMacros {
    const total: Macros = {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0
    };

    let matchedCount = 0;

    for (const match of matchResults) {
      if (match.matchConfidence !== 'unmatched' && match.nutrition) {
        matchedCount++;
        total.calories += match.nutrition.calories;
        total.proteinG += match.nutrition.proteinG;
        total.carbsG += match.nutrition.carbsG;
        total.fatG += match.nutrition.fatG;
      }
    }

    this.roundMacros(total);

    let perServing: Macros | null = null;
    if (servings && servings > 0) {
      perServing = {
        calories: total.calories / servings,
        proteinG: total.proteinG / servings,
        carbsG: total.carbsG / servings,
        fatG: total.fatG / servings
      };
      this.roundMacros(perServing);
    }

    return {
      total,
      perServing,
      matchedIngredientCount: matchedCount,
      totalIngredientCount: matchResults.length
    };
  }

  private roundMacros(macros: Macros) {
    macros.calories = Math.round(macros.calories * 10) / 10;
    macros.proteinG = Math.round(macros.proteinG * 10) / 10;
    macros.carbsG = Math.round(macros.carbsG * 10) / 10;
    macros.fatG = Math.round(macros.fatG * 10) / 10;
  }
}
