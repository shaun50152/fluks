/**
 * Saved tab — displays saved recipes and saved posts grouped by content type.
 * Requirements: 15.1, 15.4, 15.5
 */
import React, { useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSavedStore } from '@/stores/saved.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import {
  BrandColors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
} from '@/constants/theme';
import type { SavedItem } from '@/types/domain';

interface RowProps {
  item: SavedItem;
  label: string;
  onUnsave: (entityType: 'recipe' | 'post', entityId: string) => void;
}

function SavedRow({ item, label, onUnsave }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <Pressable
        style={styles.unsaveButton}
        onPress={() => onUnsave(item.entityType, item.entityId)}
        accessibilityLabel={`Unsave ${label}`}
        accessibilityRole="button"
      >
        <Text style={styles.unsaveText}>Unsave</Text>
      </Pressable>
    </View>
  );
}

function SavedScreenContent() {
  const { savedRecipes, savedPosts, isLoading, error, fetchSaved, unsaveEntity } = useSavedStore();

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const handleUnsave = useCallback(
    (entityType: 'recipe' | 'post', entityId: string) => unsaveEntity(entityType, entityId),
    [unsaveEntity],
  );

  if (isLoading && savedRecipes.length === 0 && savedPosts.length === 0) {
    return <SafeAreaView style={styles.centered}><LoadingSpinner message="Loading saved items…" /></SafeAreaView>;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <ErrorCard title="Couldn't load saved items" message={error} onRetry={fetchSaved} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.screenTitle}>Saved</Text>

        <Text style={styles.sectionHeader}>Saved Recipes</Text>
        {savedRecipes.length === 0
          ? <Text style={styles.emptyText}>No saved recipes yet.</Text>
          : savedRecipes.map((item) => (
              <SavedRow key={item.id} item={item} label={`Recipe ${item.entityId}`} onUnsave={handleUnsave} />
            ))}

        <Text style={styles.sectionHeader}>Saved Posts</Text>
        {savedPosts.length === 0
          ? <Text style={styles.emptyText}>No saved posts yet.</Text>
          : savedPosts.map((item) => (
              <SavedRow key={item.id} item={item} label={`Post ${item.entityId}`} onUnsave={handleUnsave} />
            ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SavedScreen() {
  return (
    <ErrorBoundary>
      <SavedScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background, paddingHorizontal: Spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BrandColors.background },
  screenTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, color: BrandColors.text, marginTop: Spacing.lg, marginBottom: Spacing.md },
  sectionHeader: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: BrandColors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BrandColors.surface, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  rowLabel: { flex: 1, fontSize: FontSize.sm, color: BrandColors.text, marginRight: Spacing.sm },
  unsaveButton: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: BrandColors.error, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  unsaveText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium as any, color: BrandColors.textInverse },
  emptyText: { fontSize: FontSize.sm, color: BrandColors.textSecondary, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
});
