// ── Enumerations ────────────────────────────────────────────────
export type Persona = 'student' | 'employee' | 'fitness' | 'irregular';
export type Goal = 'build_muscle' | 'lose_fat' | 'maintain' | 'improve_energy' | 'eat_cleaner';
export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten_free' | 'dairy_free' | 'halal' | 'kosher' | 'nut_free';
export type EventType =
  | 'app_open' | 'recipe_view' | 'recipe_save' | 'cook_now' | 'meal_completed'
  | 'post_view' | 'post_like' | 'post_share' | 'notification_open'
  | 'pantry_add' | 'pantry_remove' | 'prep_confirmed' | 'suggestion_dismiss' | 'post_created';
export type PostType = 'short_video' | 'image' | 'recipe_card';
export type UtilityAction = 'cook_now' | 'save_recipe' | 'add_to_prep_list' | 'see_missing_ingredients';
export type NotificationCategory = 'meal_window' | 'prep_reminder' | 'social_activity' | 'adaptive_schedule';
export type PantryClassification = 'cook_now' | '1_ingredient_away' | 'needs_shopping';
export type Intensity = 'low' | 'medium' | 'high';
export type ScheduleContext = 'default' | 'work_day' | 'rest_day';

// ── Domain Models ───────────────────────────────────────────────
export interface Profile {
  id: string;
  persona: Persona;
  goals: Goal[];
  dietaryTags: DietaryTag[];
  onboarded: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  expiryDate: string | null; // ISO 8601 date
  isStaple: boolean;
  isManual: boolean;
  createdAt: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  tags: DietaryTag[];
}

export interface RecipeStep {
  order: number;
  instruction: string;
}

export interface Macros {
  calories: number;
  protein: number; // grams
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  macros: Macros;
  tags: string[];
  cookTime: number; // minutes
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  authorId: string | null;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  postType: PostType;
  caption: string | null;
  mediaUrl: string | null;
  recipeId: string | null;
  likeCount: number;
  viewCount: number;
  shareCount: number;
  createdAt: string;
}

export interface BehaviorEvent {
  id: string;
  userId: string;
  eventType: EventType;
  entityId: string | null;
  sessionId: string;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}

export interface MealWindow {
  id: string;
  schedulePatternId: string;
  dayOfWeek: number; // 0 = Sunday
  windowName: string;
  startTime: string; // "HH:mm"
  endTime: string;
  isManualOverride: boolean;
}

export interface SchedulePattern {
  id: string;
  userId: string;
  context: ScheduleContext;
  mealWindows: MealWindow[];
  isDrifted: boolean;
  isManual: boolean;
  updatedAt: string;
}

export interface PrepSuggestion {
  id: string;
  userId: string;
  recipeId: string;
  recipe: Recipe;
  targetDatetime: string;
  dismissedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  entityType: 'recipe' | 'post';
  entityId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  activityType: string;
  durationMin: number;
  intensity: Intensity | null;
  sourceId: string | null;
  loggedAt: string;
}

// ── Offline Queue ───────────────────────────────────────────────
export interface QueuedMutation {
  id: string;
  type: 'behavior_event' | 'pantry_add' | 'pantry_remove' | 'saved_item_add' | 'saved_item_remove';
  payload: unknown;
  timestamp: string;
  retryCount: number;
}

// ── RecommendationEngine ────────────────────────────────────────
export interface DecisionCandidate {
  recipe: Recipe;
  pantryMatchPct: number;      // 0–1
  goalAlignmentScore: number;  // 0–1
  behaviorRecencyScore: number; // 0–1
  totalScore: number;
  missingIngredients: string[];
  classification: PantryClassification;
}

export interface UserSignalVector {
  userId: string;
  goals: Goal[];
  dietaryTags: DietaryTag[];
  pantryItems: PantryItem[];
  recentEvents: BehaviorEvent[]; // last 30 days
  mealWindow: MealWindow;
}

// ── FeedRanker ──────────────────────────────────────────────────
export interface RankedPost {
  post: Post;
  recipe: Recipe | null;
  score: number;
  recencyScore: number;
  engagementScore: number;
  pantryMatchScore: number;
  goalAlignmentScore: number;
}

// ── Notification ────────────────────────────────────────────────
export interface NotificationPayload {
  category: NotificationCategory;
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  scheduledFor: string; // ISO 8601
  deduplicationKey: string; // userId + category + window
}
