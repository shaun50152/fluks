import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { PrepSuggestionCard } from '@/components/prep/PrepSuggestionCard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { BrandColors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { usePantryStore } from '@/stores/pantry.store';
import type { PrepSuggestion } from '@/types/domain';

const DEFROST_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours in ms

function isDefrostReminder(suggestion: PrepSuggestion): boolean {
  const now = Date.now();
  const target = new Date(suggestion.targetDatetime).getTime();
  const withinWindow = target - now <= DEFROST_WINDOW_MS && target > now;
  if (!withinWindow) return false;
  const hasFrozen =
    suggestion.recipe.tags.some((t) => t.toLowerCase().includes('frozen')) ||
    suggestion.recipe.ingredients.some((i) => i.name.toLowerCase().includes('frozen'));
  return hasFrozen;
}

function PrepScreenContent() {
  const userId = useAuthStore((s) => s.userId);
  const pantryItems = usePantryStore((s) => s.items);

  const [suggestions, setSuggestions] = useState<PrepSuggestion[]>([]);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('prep_suggestions')
      .select('*, recipe:recipes(*)')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('target_datetime', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    // Filter out suggestions dismissed within the last 24h (belt-and-suspenders)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = (data ?? []).filter((row: any) => {
      if (!row.dismissed_at) return true;
      return new Date(row.dismissed_at).getTime() < cutoff;
    });

    setSuggestions(filtered as PrepSuggestion[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleConfirm = useCallback(
    (_suggestion: PrepSuggestion, missingIngredients: string[]) => {
      setShoppingList((prev) => {
        const existing = new Set(prev.map((i) => i.toLowerCase()));
        const toAdd = missingIngredients.filter((i) => !existing.has(i.toLowerCase()));
        return [...prev, ...toAdd];
      });
    },
    [],
  );

  const handleDismiss = useCallback(async (suggestion: PrepSuggestion) => {
    const dismissedAt = new Date().toISOString();
    await supabase
      .from('prep_suggestions')
      .update({ dismissed_at: dismissedAt })
      .eq('id', suggestion.id);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner message="Loading prep suggestions…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ErrorCard
          title="Couldn't load suggestions"
          message={error}
          onRetry={fetchSuggestions}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Prep</Text>

      {shoppingList.length > 0 && (
        <View style={styles.shoppingBanner}>
          <Text style={styles.shoppingLabel}>Shopping list ({shoppingList.length} items)</Text>
          <Text style={styles.shoppingItems}>{shoppingList.join(', ')}</Text>
        </View>
      )}

      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          suggestions.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥗</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptySubtitle}>No prep suggestions right now. Check back later.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View>
            {isDefrostReminder(item) && (
              <Badge
                label="❄️ Defrost reminder"
                variant="warning"
                style={styles.defrostBadge}
              />
            )}
            <PrepSuggestionCard
              suggestion={item}
              pantryItems={pantryItems}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          </View>
        )}
      />
    </View>
  );
}

export default function PrepScreen() {
  return (
    <ErrorBoundary>
      <PrepScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: BrandColors.background,
  },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    color: BrandColors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  defrostBadge: {
    marginBottom: Spacing.xs,
    marginHorizontal: Spacing.xs,
  },
  shoppingBanner: {
    backgroundColor: BrandColors.primaryLight,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 8,
  },
  shoppingLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: BrandColors.textInverse,
    marginBottom: Spacing.xs,
  },
  shoppingItems: {
    fontSize: FontSize.sm,
    color: BrandColors.textInverse,
  },
});
