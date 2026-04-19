import { ParsedIngredient } from '../types/domain';

const UNITS = [
  'cups', 'cup', 'c',
  'tablespoons', 'tablespoon', 'tbsp', 'tbs', 'T',
  'teaspoons', 'teaspoon', 'tsp', 't',
  'grams', 'gram', 'g',
  'ounces', 'ounce', 'oz',
  'pounds', 'pound', 'lbs', 'lb',
  'milliliters', 'milliliter', 'ml',
  'liters', 'liter', 'l',
  'cloves', 'clove',
  'pinch', 'pinches',
  'dash', 'dashes',
  'handful', 'handfuls',
  'sprig', 'sprigs',
  'bunch', 'bunches',
  'piece', 'pieces',
  'slice', 'slices',
  'can', 'cans',
  'package', 'packages', 'pkg'
].sort((a, b) => b.length - a.length); // Sort by length desc so "tablespoons" matches before "tablespoon"

const DESCRIPTORS = [
  'fresh', 'freshly', 'chopped', 'diced', 'minced', 'sliced', 'peeled', 'grated', 'shredded',
  'crushed', 'mashed', 'melted', 'softened', 'room temperature', 'cold', 'warm', 'hot',
  'dried', 'ground', 'roasted', 'toasted', 'baked', 'fried', 'boiled', 'steamed', 'raw',
  'cooked', 'boneless', 'skinless', 'halved', 'quartered', 'whole', 'organic', 'large',
  'medium', 'small', 'extra virgin', 'virgin', 'light', 'dark', 'unsweetened', 'sweetened',
  'canned', 'drained', 'rinsed', 'packed', 'loosely', 'firmly', 'thinly', 'thickly'
];

export class IngredientParser {
  /**
   * Parse a raw ingredient string into structured data
   */
  public parse(rawText: string | null | undefined): ParsedIngredient {
    if (rawText === null || rawText === undefined) {
      throw new Error('Ingredient text cannot be null or undefined');
    }

    const trimmed = rawText.trim();
    if (trimmed.length === 0) {
      throw new Error('Ingredient text cannot be empty');
    }
    if (trimmed.length > 200) {
      throw new Error('Ingredient text cannot exceed 200 characters');
    }

    let remaining = trimmed;
    
    // 1. Extract Amount
    let amount: number | null = null;
    // Match fractions like "1/2", "1 1/2", "1-2", "1 to 2", "1/2 to 1"
    const amountMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(?:\s*(?:-|to)\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?))?/);
    
    if (amountMatch) {
      const fullAmountString = amountMatch[0];
      remaining = remaining.slice(fullAmountString.length).trim();
      
      // Calculate amount (if it's a range, take the average)
      const parseNumber = (str: string): number => {
        if (str.includes('/')) {
          const parts = str.split(' ');
          if (parts.length === 2) {
            const [whole, frac] = parts;
            const [num, den] = frac.split('/');
            return parseInt(whole, 10) + (parseInt(num, 10) / parseInt(den, 10));
          } else {
            const [num, den] = str.split('/');
            return parseInt(num, 10) / parseInt(den, 10);
          }
        }
        return parseFloat(str);
      };

      if (amountMatch[2]) {
        amount = (parseNumber(amountMatch[1]) + parseNumber(amountMatch[2])) / 2;
      } else {
        amount = parseNumber(amountMatch[1]);
      }
    }

    // 2. Extract Unit
    let unit: string | null = null;
    const unitRegex = new RegExp(`^(${UNITS.join('|')})(?:es|s)?\\b`, 'i');
    const unitMatch = remaining.match(unitRegex);
    
    if (unitMatch) {
      unit = unitMatch[1].toLowerCase();
      // Normalize units to standard abbreviations or singular
      if (['c', 'cups'].includes(unit)) unit = 'cup';
      if (['tbs', 'tbsp', 't', 'tablespoons'].includes(unit)) unit = 'tablespoon';
      if (['tsp', 'teaspoons'].includes(unit)) unit = 'teaspoon';
      if (['g', 'grams'].includes(unit)) unit = 'gram';
      if (['oz', 'ounces'].includes(unit)) unit = 'ounce';
      if (['lb', 'lbs', 'pounds'].includes(unit)) unit = 'pound';
      if (['ml', 'milliliters'].includes(unit)) unit = 'milliliter';
      if (['l', 'liters'].includes(unit)) unit = 'liter';
      
      remaining = remaining.slice(unitMatch[0].length).trim();
      if (remaining.startsWith('of ')) {
        remaining = remaining.slice(3).trim();
      }
    }

    // 3. Normalize Name
    let normalizedName = remaining.toLowerCase();
    
    // Remove parentheticals
    normalizedName = normalizedName.replace(/\([^)]*\)/g, '').trim();
    
    // Remove descriptors
    for (const descriptor of DESCRIPTORS) {
      const descRegex = new RegExp(`\\b${descriptor}\\b`, 'gi');
      normalizedName = normalizedName.replace(descRegex, '');
    }
    
    // Remove extra punctuation and whitespace
    normalizedName = normalizedName.replace(/[.,;:]/g, '').replace(/\s+/g, ' ').trim();
    
    // If normalized name is empty, fallback to a cleaned up remaining text
    if (normalizedName === '') {
      normalizedName = remaining.toLowerCase().replace(/[.,;:]/g, '').replace(/\s+/g, ' ').trim();
      // If still empty (e.g. input was just "1 cup"), fallback to original string
      if (normalizedName === '') {
          normalizedName = trimmed;
      }
    }

    return {
      rawText: trimmed,
      normalizedName,
      amount,
      unit,
    };
  }

  /**
   * Format structured data back into a readable string
   */
  public format(parsed: ParsedIngredient): string {
    const parts: string[] = [];
    if (parsed.amount !== null) {
      // Very naive decimal to string conversion for property testing purposes
      parts.push(parsed.amount.toString());
    }
    if (parsed.unit !== null) {
      parts.push(parsed.unit);
    }
    parts.push(parsed.normalizedName);
    return parts.join(' ').trim();
  }
}
