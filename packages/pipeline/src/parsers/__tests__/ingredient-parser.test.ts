import { IngredientParser } from '../ingredient-parser';
import * as fc from 'fast-check';

describe('IngredientParser', () => {
  const parser = new IngredientParser();

  describe('parse() unit tests', () => {
    it('parses standard ingredient with amount and unit', () => {
      const result = parser.parse('1 cup chopped onions');
      expect(result.amount).toBe(1);
      expect(result.unit).toBe('cup');
      expect(result.normalizedName).toBe('onions');
    });

    it('parses fractional amounts', () => {
      const result = parser.parse('1/2 tsp salt');
      expect(result.amount).toBe(0.5);
      expect(result.unit).toBe('teaspoon');
      expect(result.normalizedName).toBe('salt');
    });

    it('parses mixed fractional amounts', () => {
      const result = parser.parse('1 1/2 cups flour');
      expect(result.amount).toBe(1.5);
      expect(result.unit).toBe('cup');
      expect(result.normalizedName).toBe('flour');
    });

    it('parses ranges', () => {
      const result = parser.parse('1-2 tablespoons olive oil');
      expect(result.amount).toBe(1.5); // Average
      expect(result.unit).toBe('tablespoon');
      expect(result.normalizedName).toBe('olive oil');
    });

    it('parses ingredient with no unit', () => {
      const result = parser.parse('3 large eggs');
      expect(result.amount).toBe(3);
      expect(result.unit).toBeNull();
      expect(result.normalizedName).toBe('eggs');
    });

    it('parses ingredient with no amount', () => {
      const result = parser.parse('salt to taste');
      expect(result.amount).toBeNull();
      expect(result.unit).toBeNull();
      expect(result.normalizedName).toBe('salt to taste');
    });

    it('removes parentheticals', () => {
      const result = parser.parse('1 cup flour (all-purpose)');
      expect(result.amount).toBe(1);
      expect(result.unit).toBe('cup');
      expect(result.normalizedName).toBe('flour');
    });

    it('validates input correctly', () => {
      expect(() => parser.parse('')).toThrow('Ingredient text cannot be empty');
      expect(() => parser.parse(null as any)).toThrow('Ingredient text cannot be null or undefined');
      expect(() => parser.parse('a'.repeat(201))).toThrow('Ingredient text cannot exceed 200 characters');
    });
  });

  describe('Property tests', () => {
    it('Property 1: Ingredient Parser Round-Trip', () => {
      fc.assert(
        fc.property(
          fc.record({
            rawText: fc.string({ minLength: 1, maxLength: 200 }),
            normalizedName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0 && !s.match(/\d/)),
            amount: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 100 })),
            unit: fc.constantFrom(null, 'cup', 'teaspoon', 'tablespoon', 'gram', 'ounce', 'pound')
          }),
          (parsed) => {
            const formatted = parser.format(parsed);
            if (formatted.length > 200) return true; // Skip if formatting makes it too long
            const result = parser.parse(formatted);
            
            // Name might be altered slightly by normalize, but amount and unit should match
            expect(result.amount).toBe(parsed.amount);
            expect(result.unit).toBe(parsed.unit);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2: Ingredient Parser Input Validation', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 1000 }),
          (str) => {
            if (str.trim().length === 0) {
              expect(() => parser.parse(str)).toThrow();
            } else if (str.trim().length > 200) {
              expect(() => parser.parse(str)).toThrow();
            } else {
              expect(() => parser.parse(str)).not.toThrow();
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 3: Ingredient Parser Extraction Correctness', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          (str) => {
            const result = parser.parse(str);
            expect(result.normalizedName.length).toBeGreaterThan(0);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
