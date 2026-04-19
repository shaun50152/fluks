import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { PrepSuggestionCard } from '@/components/prep/PrepSuggestionCard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  AnimationDuration,
  Shadow,
} from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { usePantryStore } from '@/stores/pantry.store';
import type { PrepSuggestion } from '@/types/domain';

const DEFROST_WINDOW_MS = 12 * 60 * 60 * 1000;

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
    []
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
        <ErrorCard title="Couldn't load suggestions" message={error} onRetry={fetchSuggestions} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: AnimationDuration.slow }}
        style={styles.header}
      >
        <Text style={styles.heading}>Prep Ahead</Text>
        <Text style={styles.subheading}>Plan your meals for the week</Text>
      </MotiView>

      {/* Shopping List Banner */}
      {shoppingList.length > 0 && (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          style={styles.shoppingBanner}
        >
          <View style={styles.shoppingHeader}>
            <Text style={styles.shoppingIcon}>🛒</Text>
            <Text style={styles.shoppingLabel}>
              Shopping List ({shoppingList.length} items)
            </Text>
          </View>
          <Text style={styles.shoppingItems} numberOfLines={2}>
            {shoppingList.join(', ')}
          </Text>
        </MotiView>
      )}

      {/* Suggestions List */}
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          suggestions.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconContainer}>
              <Text style={styles.emptyEmoji}>🥗</Text>
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No prep suggestions right now. Check back later for meal planning ideas.
            </Text>
          </MotiView>
        }
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 50 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: AnimationDuration.slow,
              delay: index * 100,
            }}
          >
            {isDefrostReminder(item) && (
              <View style={styles.defrostBadge}>
                <Text style={styles.defrostText}>❄️ Defrost reminder</Text>
              </View>
            )}
            <PrepSuggestionCard
              suggestion={item}
              pantryItems={pantryItems}
              onConfirm={handleConfirm}
              onDismiss={handleDismiss}
            />
          </MotiView>
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
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  
  // Header
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  heading: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  
  // Shopping Banner
  shoppingBanner: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadow.md,
  },
  shoppingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  shoppingIcon: {
    fontSize: 20,
  },
  shoppingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
  },
  shoppingItems: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  
  // List
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  defrostBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  defrostText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    color: Colors.warning,
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
