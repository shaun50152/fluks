import React, { useCallback, useEffect, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { MotiView } from 'moti';
import { useSavedStore } from '@/stores/saved.store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import {
  Colors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
  AnimationDuration,
  Shadow,
} from '@/constants/theme';
import type { SavedItem } from '@/types/domain';

interface SavedRowProps {
  item: SavedItem;
  label: string;
  onUnsave: (entityType: 'recipe' | 'post', entityId: string) => void;
  index: number;
}

function SavedRow({ item, label, onUnsave, index }: SavedRowProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{
        type: 'timing',
        duration: AnimationDuration.normal,
        delay: index * 50,
      }}
      style={styles.row}
    >
      <View style={styles.rowContent}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{item.entityType === 'recipe' ? '🍳' : '📷'}</Text>
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.rowDate}>
            Saved {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unsaveButton}
        onPress={() => onUnsave(item.entityType, item.entityId)}
        accessibilityLabel={`Unsave ${label}`}
        accessibilityRole="button"
      >
        <Text style={styles.unsaveIcon}>×</Text>
      </TouchableOpacity>
    </MotiView>
  );
}

function SavedScreenContent() {
  const { savedRecipes, savedPosts, isLoading, error, fetchSaved, unsaveEntity } =
    useSavedStore();
  const [activeTab, setActiveTab] = useState<'recipes' | 'posts'>('recipes');

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const handleUnsave = useCallback(
    (entityType: 'recipe' | 'post', entityId: string) => unsaveEntity(entityType, entityId),
    [unsaveEntity]
  );

  if (isLoading && savedRecipes.length === 0 && savedPosts.length === 0) {
    return (
      <View style={styles.centered}>
        <LoadingSpinner message="Loading saved items…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ErrorCard title="Couldn't load saved items" message={error} onRetry={fetchSaved} />
      </View>
    );
  }

  const sections = [
    {
      title: 'Recipes',
      data: savedRecipes,
      key: 'recipes' as const,
    },
    {
      title: 'Posts',
      data: savedPosts,
      key: 'posts' as const,
    },
  ];

  const activeData = activeTab === 'recipes' ? savedRecipes : savedPosts;

  return (
    <View style={styles.container}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: AnimationDuration.slow }}
        style={styles.header}
      >
        <Text style={styles.heading}>Saved</Text>
        <Text style={styles.subheading}>Your bookmarked recipes and posts</Text>
      </MotiView>

      {/* Tab Switcher */}
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 100 }}
        style={styles.tabContainer}
      >
        <Pressable
          style={[styles.tab, activeTab === 'recipes' && styles.tabActive]}
          onPress={() => setActiveTab('recipes')}
        >
          <Text style={[styles.tabText, activeTab === 'recipes' && styles.tabTextActive]}>
            Recipes ({savedRecipes.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts ({savedPosts.length})
          </Text>
        </Pressable>
      </MotiView>

      {/* List */}
      {activeData.length === 0 ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, delay: 200 }}
          style={styles.emptyState}
        >
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'recipes' ? '🍳' : '📷'}
            </Text>
          </View>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'recipes'
              ? 'Save recipes you want to cook later'
              : 'Save posts that inspire you'}
          </Text>
        </MotiView>
      ) : (
        <SectionList
          sections={[{ title: activeTab === 'recipes' ? 'Recipes' : 'Posts', data: activeData }]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <SavedRow
              item={item}
              label={`${item.entityType === 'recipe' ? 'Recipe' : 'Post'} ${item.entityId.slice(0, 8)}`}
              onUnsave={handleUnsave}
              index={index}
            />
          )}
          renderSectionHeader={() => null}
        />
      )}
    </View>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  
  // List
  listContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
    color: Colors.text,
  },
  rowDate: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  unsaveButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsaveIcon: {
    fontSize: 24,
    color: Colors.error,
    fontWeight: FontWeight.bold as any,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
