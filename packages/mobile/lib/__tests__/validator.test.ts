/**
 * Property-based tests for lib/validator.ts
 *
 * Validates: Requirements 1.8, 2.2, 2.3, 3.5, 4.6, 4.7, 11.3, 11.4, 11.8
 */

import * as fc from 'fast-check';
import {
  validatePersona,
  validateDietaryTag,
  validatePantryItemName,
  validatePantryItemQuantity,
  validatePostCaption,
  validateMediaFile,
  validateEmail,
  validatePassword,
  ValidationError,
} from '../validator';

const VALID_PERSONAS = ['student', 'employee', 'fitness', 'irregular'] as const;
const VALID_DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_free',
] as const;

// ── Property 2: Persona validator rejection ──────────────────────────────────
// Validates: Requirements 1.8
describe('Property 2: Persona validator rejection', () => {
  it('rejects any string that is not a valid persona enum value', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !(VALID_PERSONAS as readonly string[]).includes(s)),
        (invalidPersona) => {
          expect(() => validatePersona(invalidPersona)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Dietary tag validator rejection ──────────────────────────────
// Validates: Requirements 3.5
describe('Property 3: Dietary tag validator rejection', () => {
  it('rejects any string that is not a valid dietary tag enum value', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !(VALID_DIETARY_TAGS as readonly string[]).includes(s)),
        (invalidTag) => {
          expect(() => validateDietaryTag(invalidTag)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: PantryItem name validation ───────────────────────────────────
// Validates: Requirements 4.6
describe('Property 5: PantryItem name validation', () => {
  it('rejects empty string', () => {
    expect(() => validatePantryItemName('')).toThrow(ValidationError);
  });

  it('rejects whitespace-only strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1 }).map(chars => chars.join('')),
        (whitespace) => {
          expect(() => validatePantryItemName(whitespace)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects strings longer than 100 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101 }),
        (longName) => {
          expect(() => validatePantryItemName(longName)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 6: PantryItem negative quantity rejection ───────────────────────
// Validates: Requirements 4.7
describe('Property 6: PantryItem negative quantity rejection', () => {
  it('rejects any negative float quantity', () => {
    fc.assert(
      fc.property(
        fc.float({ max: Math.fround(-0.001), noNaN: true }).filter(n => n < 0),
        (negativeQty) => {
          expect(() => validatePantryItemQuantity(negativeQty)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 20: Post caption length validation ──────────────────────────────
// Validates: Requirements 11.8
describe('Property 20: Post caption length validation', () => {
  it('rejects captions longer than 500 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501 }),
        (longCaption) => {
          expect(() => validatePostCaption(longCaption)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 21: Video file size validation ──────────────────────────────────
// Validates: Requirements 11.3
const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

describe('Property 21: Video file size validation', () => {
  it('rejects short_video files larger than 100 MB', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: VIDEO_MAX_BYTES + 1, max: VIDEO_MAX_BYTES * 10 }),
        (oversizedBytes) => {
          expect(() =>
            validateMediaFile({ size: oversizedBytes }, 'short_video')
          ).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 22: Image file size validation ──────────────────────────────────
// Validates: Requirements 11.4
const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

describe('Property 22: Image file size validation', () => {
  it('rejects image files larger than 10 MB', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: IMAGE_MAX_BYTES + 1, max: IMAGE_MAX_BYTES * 10 }),
        (oversizedBytes) => {
          expect(() =>
            validateMediaFile({ size: oversizedBytes }, 'image')
          ).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 33: Email format validation ─────────────────────────────────────
// Validates: Requirements 2.2
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('Property 33: Email format validation', () => {
  it('rejects strings that do not match email format', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !EMAIL_REGEX.test(s)),
        (invalidEmail) => {
          expect(() => validateEmail(invalidEmail)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 34: Password minimum length validation ──────────────────────────
// Validates: Requirements 2.3
describe('Property 34: Password minimum length validation', () => {
  it('rejects passwords shorter than 8 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 7 }),
        (shortPassword) => {
          expect(() => validatePassword(shortPassword)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});
