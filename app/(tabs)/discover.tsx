import React, { useEffect } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PostCard } from '@/components/feed/PostCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { useFeedStore } from '@/stores/feed.store';
import { usePantryStore } from '@/stores/pantry.store';
import { useSavedStore } from '@/stores/saved.store';
import { useNetwork } from '@/hooks/use-network';
import { logEvent } from '@/lib/behavior-logger';
import { BrandColors, FontSize, Spacing } from '@/constants/theme';
import type { Post, RankedPost, UtilityAction } from '@/types/domain';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function DiscoverScreenContent() {
  const { posts, hasMore, isLoading, error, fetchFeed, loadMore, loadCachedFeed } = useFeedStore();
  const { items: pantryItems } = usePantryStore();
  const { saveEntity } = useSavedStore();
  const { isConnected } = useNetwork();

  useEffect(() => {
    loadCachedFeed();
    fetchFeed();
  }, []);

  const handleUtilityAction = (action: UtilityAction, post: Post) => {
    switch (action) {
      case 'cook_now':
        if (post.recipeId) router.push(`/recipe/${post.recipeId}`);
        break;
      case 'save_recipe':
        if (post.recipeId) {
          saveEntity('recipe', post.recipeId);
          logEvent('recipe_save', post.recipeId);
        }
        break;
      case 'add_to_prep_list':
        // TODO (task 7.5): wire up prep store
        break;
      case 'see_missing_ingredients':
        if (post.recipeId) router.push(`/recipe/${post.recipeId}`);
        break;
    }
  };

  const handleEndReached = () => {
    if (hasMore && !isLoading) loadMore();
  };

  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <LoadingSpinner message="Loading feed..." />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ErrorCard title="Couldn't load feed" message={error} onRetry={fetchFeed} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>📡 Offline mode — showing cached content</Text>
        </View>
      )}
      <FlatList
        data={posts}
        keyExtractor={(item: RankedPost) => item.post.id}
        renderItem={({ item }: { item: RankedPost }) => (
          <PostCard
            post={item.post}
            recipe={item.recipe}
            pantryItems={pantryItems}
            onUtilityAction={handleUtilityAction}
          />
        )}
        contentContainerStyle={styles.list}
        onEndReached={handleEndReached}
        onEndReachedThreshold={3}
        ListFooterComponent={
          isLoading ? (
            <LoadingSpinner size="small" message="" />
          ) : !hasMore ? (
            <Text style={styles.caughtUp}>You're all caught up 🎉</Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No posts yet. Check back soon!</Text>
        }
      />
    </View>
  );
}

export default function DiscoverScreen() {
  return (
    <ErrorBoundary>
      <DiscoverScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  offlineBanner: {
    backgroundColor: BrandColors.warning + '33',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  offlineText: { fontSize: FontSize.sm, color: BrandColors.secondary },
  list: { padding: Spacing.md },
  caughtUp: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
    padding: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.md,
    color: BrandColors.textSecondary,
    marginTop: Spacing.xxl,
  },
});
