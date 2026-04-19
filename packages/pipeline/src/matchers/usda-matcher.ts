import { ParsedIngredient, MatchResult, NutritionData } from '../types/domain';
import { logger } from '../utils/logger';

export class USDAMatcher {
  private cache = new Map<string, MatchResult>();
  private hits = 0;
  private misses = 0;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public getCacheStats(): { hits: number; misses: number } {
    return { hits: this.hits, misses: this.misses };
  }

  public async match(ingredient: ParsedIngredient): Promise<MatchResult> {
    const { normalizedName } = ingredient;
    
    // Check Cache
    if (this.cache.has(normalizedName)) {
      this.hits++;
      const cached = this.cache.get(normalizedName)!;
      logger.debug('match', `Cache hit for ingredient: ${normalizedName}`, {
        matchConfidence: cached.matchConfidence
      });
      // Return a new object so we don't accidentally mutate the cached ingredient ref
      return {
        ...cached,
        ingredient
      };
    }
    
    this.misses++;
    logger.debug('match', `Cache miss for ingredient: ${normalizedName}`);

    // Layer 1: Exact normalized match
    logger.debug('match', `Layer 1: Attempting exact match for: ${normalizedName}`);
    let result = await this.searchUSDA(normalizedName, 'exact');
    if (result) {
      result.ingredient = ingredient;
      this.cache.set(normalizedName, result);
      logger.info('match', `Exact match found for: ${normalizedName}`, {
        usdaFoodId: result.usdaFoodId,
        matchConfidence: 'exact'
      });
      return result;
    }

    // Layer 2: Simplified keyword match
    const keywordQuery = this.simplifyKeyword(normalizedName);
    if (keywordQuery && keywordQuery !== normalizedName) {
      logger.debug('match', `Layer 2: Attempting keyword match for: ${normalizedName} -> ${keywordQuery}`);
      result = await this.searchUSDA(keywordQuery, 'keyword');
      if (result) {
        result.ingredient = ingredient;
        this.cache.set(normalizedName, result);
        logger.info('match', `Keyword match found for: ${normalizedName}`, {
          simplifiedQuery: keywordQuery,
          usdaFoodId: result.usdaFoodId,
          matchConfidence: 'keyword'
        });
        return result;
      }
    }

    // Layer 3: Fallback search (use broader query with first word only)
    const fallbackQuery = this.getFallbackQuery(normalizedName);
    if (fallbackQuery && fallbackQuery !== normalizedName && fallbackQuery !== keywordQuery) {
      logger.debug('match', `Layer 3: Attempting fallback search for: ${normalizedName} -> ${fallbackQuery}`);
      result = await this.searchUSDA(fallbackQuery, 'fallback');
      if (result) {
        result.ingredient = ingredient;
        this.cache.set(normalizedName, result);
        logger.info('match', `Fallback match found for: ${normalizedName}`, {
          fallbackQuery,
          usdaFoodId: result.usdaFoodId,
          matchConfidence: 'fallback'
        });
        return result;
      }
    }

    // Layer 4: Mark as unmatched (do not hallucinate data)
    logger.info('match', `No match found for: ${normalizedName}`, {
      matchConfidence: 'unmatched'
    });
    const unmatched: MatchResult = {
      ingredient,
      usdaFoodId: null,
      matchConfidence: 'unmatched',
      nutrition: null
    };
    
    this.cache.set(normalizedName, unmatched);
    return unmatched;
  }

  private simplifyKeyword(name: string): string {
    return name
      .replace(/\b(raw|cooked|boneless|skinless|fresh|canned|frozen|large|small|medium|diced|chopped|sliced)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getFallbackQuery(name: string): string {
    // Extract the first significant word for broader search
    const words = name.split(' ').filter(w => w.length > 2);
    return words.length > 0 ? words[0] : name;
  }

  private async searchUSDA(query: string, confidence: 'exact' | 'keyword' | 'fallback'): Promise<MatchResult | null> {
    if (!query) return null;
    
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&pageSize=1`;
      
      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 429) {
          logger.warn('match', 'USDA API rate limit reached', { query, confidence });
          throw new Error('USDA_RATE_LIMIT');
        }
        logger.warn('match', `USDA API error: ${res.status}`, { 
          query, 
          confidence,
          status: res.status 
        });
        return null;
      }
      
      const data = await res.json();
      
      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        const nutrition = this.extractNutrition(food.foodNutrients);
        
        logger.debug('match', `USDA search successful`, {
          query,
          confidence,
          foodName: food.description,
          fdcId: food.fdcId
        });
        
        return {
          ingredient: null as any, // Populated by caller
          usdaFoodId: food.fdcId.toString(),
          matchConfidence: confidence,
          nutrition
        };
      }
      
      logger.debug('match', `No USDA results for query`, { query, confidence });
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === 'USDA_RATE_LIMIT') {
          throw e;
        }
        if (e.name === 'AbortError') {
          logger.error('match', 'USDA API request timeout', { 
            query, 
            confidence,
            timeout: '10s'
          });
          return null;
        }
      }
      logger.error('match', 'Failed to fetch from USDA', { 
        query,
        confidence,
        error: e instanceof Error ? e.message : String(e)
      });
    }
    
    return null;
  }

  private extractNutrition(nutrients: any[]): NutritionData {
    // USDA Nutrient IDs:
    // Calories: 1008
    // Protein: 1003
    // Fat: 1004
    // Carbs: 1005
    const getVal = (id: number, fallbackStrId: string): number => {
      if (!nutrients) return 0;
      const n = nutrients.find(x => x.nutrientId === id || x.nutrientNumber === fallbackStrId);
      return n && typeof n.value === 'number' ? Math.max(0, n.value) : 0;
    };

    return {
      calories: getVal(1008, '208'),
      proteinG: getVal(1003, '203'),
      fatG: getVal(1004, '204'),
      carbsG: getVal(1005, '205')
    };
  }
}
