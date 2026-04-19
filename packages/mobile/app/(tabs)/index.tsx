import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DecisionCard, DecisionCardSkeleton } from '@/components/decision-card/DecisionCard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { useMealWindow } from '@/hooks/use-meal-window';
import { useScheduleStore } from '@/stores/schedule.store';
import { usePantryStore } from '@/stores/pantry.store';
import { useProfileStore } from '@/stores/profile.store';
import { getDecisionCandidates } from '@/lib/recommendation-engine';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { DecisionCandidate, Recipe, UserSignalVector } from '@/types/domain';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

function HomeScreenContent() {
  const { activeMealWindow, nextMealWindow, minutesUntilNext } = useMealWindow();
  const { fetchSchedule } = useScheduleStore();
  const { items: pantryItems, fetchPantry } = usePantryStore();
  const { profile } = useProfileStore();
  const { userId } = useAuthStore();

  const [candidates, setCandidates] = useState<DecisionCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchSchedule(), fetchPantry()]);
        const { data: recipes, error: recipesError } = await supabase
          .from('recipes')
          .select('*')
          .limit(50);
        if (recipesError) throw new Error(recipesError.message);

        if (!activeMealWindow || !recipes?.length) {
          setCandidates([]);
          return;
        }

        const signals: UserSignalVector = {
          userId: userId ?? '',
          goals: profile?.goals ?? [],
          dietaryTags: profile?.dietaryTags ?? [],
          pantryItems,
          recentEvents: [],
          mealWindow: activeMealWindow,
        };

        const ranked = getDecisionCandidates(signals, recipes as Recipe[]);
        setCandidates(ranked);
        setCurrentIndex(0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [activeMealWindow?.id]);

  const handleCookNow = () => {
    const candidate = candidates[currentIndex];
    if (!candidate) return;
    router.push(`/recipe/${candidate.recipe.id}`);
  };

  const handleDismiss = () => {
    setCurrentIndex((i) => Math.min(i + 1, candidates.length - 1));
  };

  const handleSave = () => {
    // TODO (task 5.4): wire up savedStore.saveEntity
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <DecisionCardSkeleton />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorCard title="Something went wrong" message={error} onRetry={() => setError(null)} />
      </View>
    );
  }

  const currentCandidate = candidates[currentIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeMealWindow && currentCandidate ? (
        <DecisionCard
          recipe={currentCandidate.recipe}
          mealWindow={activeMealWindow}
          missingIngredients={currentCandidate.missingIngredients}
          onCookNow={handleCookNow}
          onDismiss={handleDismiss}
          onSave={handleSave}
        />
      ) : (
        <NextMealPrompt
          windowName={nextMealWindow?.windowName ?? 'next meal'}
          minutesUntilNext={minutesUntilNext}
        />
      )}
    </ScrollView>
  );
}

function NextMealPrompt({ windowName, minutesUntilNext }: { windowName: string; minutesUntilNext: number }) {
  const hours = Math.floor(minutesUntilNext / 60);
  const mins = minutesUntilNext % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <View style={styles.nextMealContainer}>
      <Text style={styles.nextMealEmoji}>⏰</Text>
      <Text style={styles.nextMealTitle}>Next up: {windowName}</Text>
      <Text style={styles.nextMealSubtitle}>Starting in {timeStr}</Text>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <ErrorBoundary>
      <HomeScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingTop: Spacing.lg },
  nextMealContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.sm,
  },
  nextMealEmoji: { fontSize: 48 },
  nextMealTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, color: Colors.text },
  nextMealSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
});
