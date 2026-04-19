import type { Persona, DietaryTag, PostType } from '@/types/domain';

// ── ValidationError ─────────────────────────────────────────────
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

type ValidResult = { valid: true };

// ── Enum validators ─────────────────────────────────────────────
const VALID_PERSONAS: Persona[] = ['student', 'employee', 'fitness', 'irregular'];
const VALID_DIETARY_TAGS: DietaryTag[] = [
  'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_free',
];

export function validatePersona(value: unknown): ValidResult {
  if (!VALID_PERSONAS.includes(value as Persona)) {
    throw new ValidationError(
      `Invalid persona "${value}". Must be one of: ${VALID_PERSONAS.join(', ')}.`
    );
  }
  return { valid: true };
}

export function validateDietaryTag(value: unknown): ValidResult {
  if (!VALID_DIETARY_TAGS.includes(value as DietaryTag)) {
    throw new ValidationError(
      `Invalid dietary tag "${value}". Must be one of: ${VALID_DIETARY_TAGS.join(', ')}.`
    );
  }
  return { valid: true };
}

// ── Pantry validators ───────────────────────────────────────────
export function validatePantryItemName(name: unknown): ValidResult {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Pantry item name must not be empty.');
  }
  if (name.length > 100) {
    throw new ValidationError('Pantry item name must not exceed 100 characters.');
  }
  return { valid: true };
}

export function validatePantryItemQuantity(qty: unknown): ValidResult {
  if (typeof qty !== 'number' || qty < 0) {
    throw new ValidationError('Pantry item quantity must be a non-negative number.');
  }
  return { valid: true };
}

// ── Post validators ─────────────────────────────────────────────
export function validatePostCaption(caption: unknown): ValidResult {
  if (typeof caption !== 'string') {
    throw new ValidationError('Post caption must be a string.');
  }
  if (caption.length > 500) {
    throw new ValidationError('Post caption must not exceed 500 characters.');
  }
  return { valid: true };
}

const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;  // 10 MB

export function validateMediaFile(file: { size: number }, postType: PostType): ValidResult {
  if (postType === 'short_video') {
    if (file.size > VIDEO_MAX_BYTES) {
      throw new ValidationError(
        `Video file size must not exceed 100 MB (got ${(file.size / 1024 / 1024).toFixed(2)} MB).`
      );
    }
  } else if (postType === 'image' || postType === 'recipe_card') {
    if (file.size > IMAGE_MAX_BYTES) {
      throw new ValidationError(
        `Image file size must not exceed 10 MB (got ${(file.size / 1024 / 1024).toFixed(2)} MB).`
      );
    }
  }
  return { valid: true };
}

// ── Auth validators ─────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): ValidResult {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    throw new ValidationError('Invalid email address format.');
  }
  return { valid: true };
}

export function validatePassword(password: unknown): ValidResult {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }
  return { valid: true };
}

// ── Safe deserializer ───────────────────────────────────────────
export function safeDeserialize<T>(data: unknown, fallback: T): T {
  if (data === null || data === undefined) return fallback;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('[safeDeserialize]', error);
      return fallback;
    }
  }
  return data as T;
}

// ── Domain record validator ─────────────────────────────────────
type FieldTypeMap = Record<string, string>;

export function validateDomainRecord<T extends Record<string, unknown> = Record<string, unknown>>(
  record: unknown,
  schema: FieldTypeMap
): ValidResult {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    throw new ValidationError('Record must be a non-null object.');
  }

  const obj = record as Record<string, unknown>;

  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in obj)) {
      throw new ValidationError(`Missing required field: "${field}".`);
    }
    // eslint-disable-next-line valid-typeof
    if (typeof obj[field] !== expectedType) {
      throw new ValidationError(
        `Field "${field}" must be of type "${expectedType}", got "${typeof obj[field]}".`
      );
    }
  }

  return { valid: true };
}
