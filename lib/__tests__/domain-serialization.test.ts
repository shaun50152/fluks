/**
 * Property-based tests for domain model round-trip serialization
 *
 * Validates: Requirements 4.9, 19.2, 19.3, 19.4, 19.5
 */

import * as fc from 'fast-check';
import type {
  Profile,
  Recipe,
  BehaviorEvent,
  SchedulePattern,
  Persona,
  Goal,
  DietaryTag,
  EventType,
  ScheduleContext,
  RecipeIngredient,
  RecipeStep,
  Macros,
  MealWindow,
} from '@/types/domain';

// ── Enum value pools ─────────────────────────────────────────────

const PERSONAS: Persona[] = ['student', 'employee', 'fitness', 'irregular'];
const GOALS: Goal[] = ['build_muscle', 'lose_fat', 'maintain', 'improve_energy', 'eat_cleaner'];
const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'halal', 'kosher', 'nut_free'];
const EVENT_TYPES: EventType[] = [
  'app_open', 'recipe_view', 'recipe_save', 'cook_now', 'meal_completed',
  'post_view', 'post_like', 'post_share', 'notification_open',
  'pantry_add', 'pantry_remove', 'prep_confirmed', 'suggestion_dismiss', 'post_created',
];
const SCHEDULE_CONTEXTS: ScheduleContext[] = ['default', 'work_day', 'rest_day'];

// ── Shared arbitraries ───────────────────────────────────────────

const isoDateArb = (): fc.Arbitrary<string> =>
  fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() })
    .map(ts => new Date(ts).toISOString());

const nullableStringArb = (): fc.Arbitrary<string | null> =>
  fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });

const nullableUuidArb = (): fc.Arbitrary<string | null> =>
  fc.option(fc.uuid(), { nil: null });

// ── Profile arbitrary ────────────────────────────────────────────

const profileArb = (): fc.Arbitrary<Profile> =>
  fc.record<Profile>({
    id: fc.uuid(),
    persona: fc.constantFrom(...PERSONAS),
    goals: fc.array(fc.constantFrom(...GOALS), { minLength: 0, maxLength: GOALS.length }),
    dietaryTags: fc.array(fc.constantFrom(...DIETARY_TAGS), { minLength: 0, maxLength: DIETARY_TAGS.length }),
    onboarded: fc.boolean(),
    createdAt: isoDateArb(),
    updatedAt: isoDateArb(),
  });

// ── Recipe arbitraries ───────────────────────────────────────────

const recipeIngredientArb = (): fc.Arbitrary<RecipeIngredient> =>
  fc.record<RecipeIngredient>({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    quantity: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: null }),
    unit: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    tags: fc.array(fc.constantFrom(...DIETARY_TAGS), { minLength: 0, maxLength: 3 }),
  });

const recipeStepArb = (): fc.Arbitrary<RecipeStep> =>
  fc.record<RecipeStep>({
    order: fc.integer({ min: 1, max: 100 }),
    instruction: fc.string({ minLength: 1, maxLength: 200 }),
  });

const macrosArb = (): fc.Arbitrary<Macros> =>
  fc.record<Macros>({
    calories: fc.integer({ min: 0, max: 5000 }),
    protein: fc.integer({ min: 0, max: 500 }),
    carbs: fc.integer({ min: 0, max: 500 }),
    fat: fc.integer({ min: 0, max: 500 }),
  });

const recipeArb = (): fc.Arbitrary<Recipe> =>
  fc.record<Recipe>({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: nullableStringArb(),
    ingredients: fc.array(recipeIngredientArb(), { minLength: 0, maxLength: 10 }),
    steps: fc.array(recipeStepArb(), { minLength: 0, maxLength: 10 }),
    macros: macrosArb(),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 10 }),
    cookTime: fc.integer({ min: 0, max: 480 }),
    mediaUrl: nullableStringArb(),
    mediaType: fc.option(fc.constantFrom<'image' | 'video'>('image', 'video'), { nil: null }),
    authorId: nullableUuidArb(),
    createdAt: isoDateArb(),
  });

// ── BehaviorEvent arbitrary ──────────────────────────────────────

const behaviorEventArb = (): fc.Arbitrary<BehaviorEvent> =>
  fc.record<BehaviorEvent>({
    id: fc.uuid(),
    userId: fc.uuid(),
    eventType: fc.constantFrom(...EVENT_TYPES),
    entityId: nullableUuidArb(),
    sessionId: fc.uuid(),
    timestamp: isoDateArb(),
    metadata: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    ),
  });

// ── SchedulePattern arbitrary ────────────────────────────────────

const mealWindowArb = (schedulePatternId: string): fc.Arbitrary<MealWindow> =>
  fc.record<MealWindow>({
    id: fc.uuid(),
    schedulePatternId: fc.constant(schedulePatternId),
    dayOfWeek: fc.integer({ min: 0, max: 6 }),
    windowName: fc.string({ minLength: 1, maxLength: 50 }),
    startTime: fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
    ).map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    endTime: fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
    ).map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    isManualOverride: fc.boolean(),
  });

const schedulePatternArb = (): fc.Arbitrary<SchedulePattern> =>
  fc.uuid().chain(patternId =>
    fc.record<SchedulePattern>({
      id: fc.constant(patternId),
      userId: fc.uuid(),
      context: fc.constantFrom(...SCHEDULE_CONTEXTS),
      mealWindows: fc.array(mealWindowArb(patternId), { minLength: 0, maxLength: 5 }),
      isDrifted: fc.boolean(),
      isManual: fc.boolean(),
      updatedAt: isoDateArb(),
    })
  );

// ── Property 30: Domain model round-trip serialization ───────────
// Validates: Requirements 4.9, 19.2, 19.3, 19.4, 19.5

describe('Property 30: Domain model round-trip serialization', () => {
  it('Profile: JSON.parse(JSON.stringify(x)) deep-equals x', () => {
    fc.assert(
      fc.property(profileArb(), (profile) => {
        const roundTripped = JSON.parse(JSON.stringify(profile)) as Profile;
        expect(roundTripped).toEqual(profile);
      }),
      { numRuns: 100 }
    );
  });

  it('Recipe: JSON.parse(JSON.stringify(x)) deep-equals x', () => {
    fc.assert(
      fc.property(recipeArb(), (recipe) => {
        const roundTripped = JSON.parse(JSON.stringify(recipe)) as Recipe;
        expect(roundTripped).toEqual(recipe);
      }),
      { numRuns: 100 }
    );
  });

  it('BehaviorEvent: JSON.parse(JSON.stringify(x)) deep-equals x', () => {
    fc.assert(
      fc.property(behaviorEventArb(), (event) => {
        const roundTripped = JSON.parse(JSON.stringify(event)) as BehaviorEvent;
        expect(roundTripped).toEqual(event);
      }),
      { numRuns: 100 }
    );
  });

  it('SchedulePattern: JSON.parse(JSON.stringify(x)) deep-equals x', () => {
    fc.assert(
      fc.property(schedulePatternArb(), (pattern) => {
        const roundTripped = JSON.parse(JSON.stringify(pattern)) as SchedulePattern;
        expect(roundTripped).toEqual(pattern);
      }),
      { numRuns: 100 }
    );
  });
});
