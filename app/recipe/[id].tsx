/**
 * Recipe detail screen
 * Requirements: 6.1, 6.2, 9.1
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CookingMode } from '@/components/recipe/CookingMode';
import { RecipeDetail } from '@/components/recipe/RecipeDetail';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BrandColors } from '@/constants/theme';
import { logEvent } from '@/lib/behavior-logger';
import { supabase } from '@/lib/supabase';
import { usePantryStore } from '@/stores/pantry.store';
import { useSavedStore } from '@/stores/saved.store';
import type { Recipe } from '@/types/domain';

function rowToRecipe(row: Record<string, unknown>): Recipe {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    ingredients: (row.ingredients as Recipe['ingredients']) ?? [],
    steps: (row.steps as Recipe['steps']) ?? [],
    macros: (row.macros as Recipe['macros']) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
    tags: (row.tags as string[]) ?? [],
    cookTime: (row.cook_time as number) ?? 0,
    mediaUrl: (row.media_url as string | null) ?? null,
    mediaType: (row.media_type as Recipe['mediaType']) ?? null,
    authorId: (row.author_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cookingMode, setCookingMode] = useState(false);

  const pantryItems = usePantryStore((s) => s.items);
  const { saveEntity, unsaveEntity, isSaved } = useSavedStore();
  const saved = recipe ? isSaved('recipe', recipe.id) : false;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }
      const r = rowToRecipe(data as Record<string, unknown>);
      setRecipe(r);
      setIsLoading(false);
      // Log recipe_view on mount (Req 9.1)
      try {
        logEvent('recipe_view', r.id);
      } catch {
        // user may not be authenticated in edge cases
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  function handleSave() {
    if (!recipe) return;
    if (saved) {
      unsaveEntity('recipe', recipe.id);
    } else {
      saveEntity('recipe', recipe.id);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner message="Loading recipe…" />
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View style={styles.center}>
        <ErrorCard
          title="Couldn't load recipe"
          message={error ?? 'Recipe not found.'}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      </View>
    );
  }

  if (cookingMode) {
    return (
      <CookingMode
        steps={recipe.steps}
        recipeId={recipe.id}
        onComplete={() => setCookingMode(false)}
      />
    );
  }

  return (
    <RecipeDetail
      recipe={recipe}
      pantryItems={pantryItems}
      onSave={handleSave}
      isSaved={saved}
      onStartCooking={() => setCookingMode(true)}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.background,
  },
});
