/**
 * Post detail screen
 * Requirements: 10.5, 9.1
 */
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { UtilityActionBar } from '@/components/feed/UtilityActionBar';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { logEvent } from '@/lib/behavior-logger';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { usePantryStore } from '@/stores/pantry.store';
import { useSavedStore } from '@/stores/saved.store';
import type { Post, Recipe, UtilityAction } from '@/types/domain';

interface PostWithRecipe extends Post {
  recipe: Recipe | null;
}

function rowToPost(row: Record<string, unknown>): PostWithRecipe {
  const recipeRow = row.recipe as Record<string, unknown> | null;
  const recipe: Recipe | null = recipeRow
    ? {
        id: recipeRow.id as string,
        title: recipeRow.title as string,
        description: (recipeRow.description as string | null) ?? null,
        ingredients: (recipeRow.ingredients as Recipe['ingredients']) ?? [],
        steps: (recipeRow.steps as Recipe['steps']) ?? [],
        macros: (recipeRow.macros as Recipe['macros']) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
        tags: (recipeRow.tags as string[]) ?? [],
        cookTime: (recipeRow.cook_time as number) ?? 0,
        mediaUrl: (recipeRow.media_url as string | null) ?? null,
        mediaType: (recipeRow.media_type as Recipe['mediaType']) ?? null,
        authorId: (recipeRow.author_id as string | null) ?? null,
        createdAt: recipeRow.created_at as string,
      }
    : null;

  return {
    id: row.id as string,
    authorId: row.author_id as string,
    postType: row.post_type as Post['postType'],
    caption: (row.caption as string | null) ?? null,
    mediaUrl: (row.media_url as string | null) ?? null,
    recipeId: (row.recipe_id as string | null) ?? null,
    likeCount: (row.like_count as number) ?? 0,
    viewCount: (row.view_count as number) ?? 0,
    shareCount: (row.share_count as number) ?? 0,
    createdAt: row.created_at as string,
    recipe,
  };
}

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostWithRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = useAuthStore((s) => s.userId);
  const pantryItems = usePantryStore((s) => s.items);
  const { saveEntity, unsaveEntity, isSaved } = useSavedStore();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*, recipe:recipes(*)')
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }
      const p = rowToPost(data as Record<string, unknown>);
      setPost(p);
      setIsLoading(false);
      // Log post_view on mount (Req 9.1)
      try {
        logEvent('post_view', p.id);
      } catch {
        // user may not be authenticated in edge cases
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  function handleUtilityAction(action: UtilityAction, p: Post) {
    if (!post?.recipe) return;
    switch (action) {
      case 'cook_now':
        router.push(`/recipe/${post.recipe.id}`);
        break;
      case 'save_recipe':
        if (isSaved('recipe', post.recipe.id)) {
          unsaveEntity('recipe', post.recipe.id);
        } else {
          saveEntity('recipe', post.recipe.id);
        }
        break;
      case 'add_to_prep_list':
        router.push('/prep');
        break;
      case 'see_missing_ingredients':
        router.push('/pantry');
        break;
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner message="Loading post…" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <ErrorCard
          title="Couldn't load post"
          message={error ?? 'Post not found.'}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      </View>
    );
  }

  const isVideo = post.postType === 'short_video';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Media */}
      {post.mediaUrl ? (
        isVideo ? (
          <Video
            source={{ uri: post.mediaUrl }}
            style={styles.media}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            accessibilityLabel={post.caption ?? 'Post video'}
          />
        ) : (
          <Image
            source={{ uri: post.mediaUrl }}
            style={styles.media}
            accessibilityLabel={post.caption ?? 'Post image'}
            resizeMode="cover"
          />
        )
      ) : (
        <View style={styles.mediaPlaceholder}>
          <Text style={styles.mediaPlaceholderText}>
            {isVideo ? '🎬' : post.postType === 'recipe_card' ? '🍽️' : '📷'}
          </Text>
        </View>
      )}

      {/* Author info */}
      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.authorId} numberOfLines={1}>
          {post.authorId}
        </Text>
      </View>

      {/* Caption */}
      {post.caption ? (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>
      ) : null}

      {/* Recipe title if linked */}
      {post.recipe ? (
        <View style={styles.recipeRow}>
          <Text style={styles.recipeLabel}>🍳 {post.recipe.title}</Text>
        </View>
      ) : null}

      {/* Engagement stats */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>❤️ {post.likeCount}</Text>
        <Text style={styles.stat}>👁 {post.viewCount}</Text>
        <Text style={styles.stat}>↗️ {post.shareCount}</Text>
      </View>

      {/* Utility actions (Req 10.5) */}
      <UtilityActionBar post={post} onAction={handleUtilityAction} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  media: { width: '100%', height: 320 },
  mediaPlaceholder: {
    width: '100%',
    height: 280,
    backgroundColor: Colors.border + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholderText: { fontSize: 64 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.border + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18 },
  authorId: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.text,
    flex: 1,
  },
  captionContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  caption: { fontSize: FontSize.md, color: Colors.text, lineHeight: 22 },
  recipeRow: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  recipeLabel: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.medium as any,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  stat: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
