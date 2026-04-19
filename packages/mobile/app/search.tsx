import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { classifyPantryMatch, getMissingIngredients } from '@/lib/pantry-utils';
import { usePantryStore } from '@/stores/pantry.store';
import {
  Colors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
  Shadow,
} from '@/constants/theme';
import type { DietaryTag, Goal, PantryClassification, Recipe } from '@/types/domain';

// ── Filter types ────────────────────────────────────────────────

type CookTimeFilter = 'any' | '<15' | '<30' | '<60';
type PantryFilter = 'any' | PantryClassification;

interface Filters {
  dietary: DietaryTag | null;
  goal: Goal | null;
  cookTime: CookTimeFilter;
  pantry: PantryFilter;
}

const DIETARY_OPTIONS: { label: string; value: DietaryTag }[] = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Gluten Free', value: 'gluten_free' },
  { label: 'Dairy Free', value: 'dairy_free' },
  { label: 'Halal', value: 'halal' },
  { label: 'Kosher', value: 'kosher' },
  { label: 'Nut Free', value: 'nut_free' },
];

const GOAL_OPTIONS: { label: string; value: Goal }[] = [
  { label: 'Build Muscle', value: 'build_muscle' },
  { label: 'Lose Fat', value: 'lose_fat' },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Improve Energy', value: 'improve_energy' },
  { label: 'Eat Cleaner', value: 'eat_cleaner' },
];

const COOK_TIME_OPTIONS: { label: string; value: CookTimeFilter }[] = [
  { label: 'Any time', value: 'any' },
  { label: '< 15 min', value: '<15' },
  { label: '< 30 min', value: '<30' },
  { label: '< 60 min', value: '<60' },
];

const PANTRY_OPTIONS: { label: string; value: PantryFilter }[] = [
  { label: 'Any', value: 'any' },
  { label: 'Cook Now', value: 'cook_now' },
  { label: '1 Away', value: '1_ingredient_away' },
  { label: 'Needs Shopping', value: 'needs_shopping' },
];

const SUGGESTIONS = [
  'pasta', 'chicken', 'salad', 'soup', 'rice', 'eggs', 'smoothie',
];

// ── Helpers ─────────────────────────────────────────────────────

function cookTimeMax(filter: CookTimeFilter): number | null {
  if (filter === '<15') return 15;
  if (filter === '<30') return 30;
  if (filter === '<60') return 60;
  return null;
}

function pantryBadgeVariant(cls: PantryClassification) {
  if (cls === 'cook_now') return 'success' as const;
  if (cls === '1_ingredient_away') return 'warning' as const;
  return 'muted' as const;
}

function pantryLabel(cls: PantryClassification) {
  if (cls === 'cook_now') return 'Cook Now';
  if (cls === '1_ingredient_away') return '1 Away';
  return 'Needs Shopping';
}

// ── FilterChip ──────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ── RecipeRow ───────────────────────────────────────────────────

function RecipeRow({
  recipe,
  pantryClass,
}: {
  recipe: Recipe;
  pantryClass: PantryClassification | null;
}) {
  return (
    <Pressable
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View recipe: ${recipe.title}`}
    >
      <Card shadow="sm" style={styles.recipeCard}>
        {recipe.mediaUrl ? (
          <Image
            source={{ uri: recipe.mediaUrl }}
            style={styles.recipeImage}
            accessibilityElementsHidden
          />
        ) : (
          <View style={[styles.recipeImage, styles.recipeImagePlaceholder]}>
            <Text style={styles.placeholderEmoji}>🍽️</Text>
          </View>
        )}
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
          <Text style={styles.recipeMeta}>⏱ {recipe.cookTime} min</Text>
          {pantryClass && (
            <Badge
              label={pantryLabel(pantryClass)}
              variant={pantryBadgeVariant(pantryClass)}
              style={styles.pantryBadge}
            />
          )}
        </View>
      </Card>
    </Pressable>
  );
}

// ── Main Screen ─────────────────────────────────────────────────

export default function SearchScreen() {
  const { items: pantryItems } = usePantryStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recipe[]>([]);
  const [pantryMap, setPantryMap] = useState<Map<string, PantryClassification>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    dietary: null,
    goal: null,
    cookTime: 'any',
    pantry: 'any',
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string, f: Filters) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setPantryMap(new Map());
        setHasSearched(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        let queryBuilder = supabase
          .from('recipes')
          .select('*')
          .ilike('title', `%${trimmed}%`);

        const maxTime = cookTimeMax(f.cookTime);
        if (maxTime !== null) {
          queryBuilder = queryBuilder.lte('cook_time', maxTime);
        }

        const { data, error: sbError } = await queryBuilder;

        if (sbError) {
          setError(sbError.message);
          setIsLoading(false);
          return;
        }

        let recipes = (data ?? []) as Recipe[];

        // Client-side dietary filter
        if (f.dietary) {
          const tag = f.dietary;
          recipes = recipes.filter((r) =>
            r.tags?.includes(tag) ||
            r.ingredients?.every((ing) => ing.tags?.includes(tag))
          );
        }

        // Client-side goal filter
        if (f.goal) {
          const goal = f.goal;
          recipes = recipes.filter((r) => r.tags?.includes(goal));
        }

        // Compute pantry classifications
        const newMap = new Map<string, PantryClassification>();
        for (const recipe of recipes) {
          const missing = getMissingIngredients(recipe.ingredients ?? [], pantryItems);
          newMap.set(recipe.id, classifyPantryMatch(missing.length));
        }

        // Pantry availability filter
        if (f.pantry !== 'any') {
          recipes = recipes.filter((r) => newMap.get(r.id) === f.pantry);
        }

        setResults(recipes);
        setPantryMap(newMap);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        setIsLoading(false);
      }
    },
    [pantryItems],
  );

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text, filters), 400);
  };

  const handleFilterChange = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, next), 0);
  };

  const handleSuggestionPress = (s: string) => {
    setQuery(s);
    runSearch(s, filters);
  };

  const renderHeader = () => (
    <View>
      {/* Search input */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search recipes…"
          placeholderTextColor={Colors.textSecondary}
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query, filters)}
          accessibilityLabel="Search recipes"
          accessibilityRole="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter sections */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Dietary</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {DIETARY_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filters.dietary === opt.value}
              onPress={() =>
                handleFilterChange({ dietary: filters.dietary === opt.value ? null : opt.value })
              }
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Goal</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {GOAL_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filters.goal === opt.value}
              onPress={() =>
                handleFilterChange({ goal: filters.goal === opt.value ? null : opt.value })
              }
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Cook Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {COOK_TIME_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filters.cookTime === opt.value}
              onPress={() => handleFilterChange({ cookTime: opt.value })}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Pantry</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {PANTRY_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filters.pantry === opt.value}
              onPress={() => handleFilterChange({ pantry: opt.value })}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.center}>
          <LoadingSpinner message="Searching…" />
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.center}>
          <ErrorCard
            title="Search failed"
            message={error}
            onRetry={() => runSearch(query, filters)}
          />
        </View>
      </View>
    );
  }

  // No results state
  if (hasSearched && results.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.center}>
          <Text style={styles.noResultsEmoji}>🔍</Text>
          <Text style={styles.noResultsTitle}>No results found</Text>
          <Text style={styles.noResultsSubtitle}>
            Try a different search or one of these suggestions:
          </Text>
          <View style={styles.suggestionsRow}>
            {SUGGESTIONS.map((s) => (
              <FilterChip
                key={s}
                label={s}
                active={false}
                onPress={() => handleSuggestionPress(s)}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RecipeRow recipe={item} pantryClass={pantryMap.get(item.id) ?? null} />
      )}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        !hasSearched ? (
          <View style={styles.center}>
            <Text style={styles.emptyHint}>Search for recipes above</Text>
          </View>
        ) : null
      }
    />
  );
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.background,
  },

  // Search input
  searchRow: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },

  // Filter chips
  filterSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    backgroundColor: Colors.surface,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium as any,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // Recipe card
  recipeCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  recipeImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  recipeImagePlaceholder: {
    backgroundColor: Colors.border + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  recipeInfo: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  recipeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  recipeMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  pantryBadge: {
    marginTop: Spacing.xs,
  },

  // No results
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  noResultsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  noResultsSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
  },

  // Empty hint
  emptyHint: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xxl,
    textAlign: 'center',
  },
});
