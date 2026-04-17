import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { UtilityActionBar } from '@/components/feed/UtilityActionBar';
import { BrandColors, FontSize, Spacing } from '@/constants/theme';
import type { PantryItem, Post, Recipe, UtilityAction } from '@/types/domain';

export interface PostCardProps {
  post: Post;
  recipe: Recipe | null;
  pantryItems: PantryItem[];
  onUtilityAction: (action: UtilityAction, post: Post) => void;
}

/**
 * Renders a single feed post card with media, caption, and utility actions.
 * Requirements: 10.1, 10.5, 9.1
 */
export function PostCard({ post, recipe, pantryItems: _pantryItems, onUtilityAction }: PostCardProps) {
  return (
    <Card style={styles.card} shadow="sm">
      {/* Media */}
      {post.mediaUrl ? (
        <Image
          source={{ uri: post.mediaUrl }}
          style={styles.media}
          accessibilityLabel={post.caption ?? 'Post image'}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.mediaPlaceholder}>
          <Text style={styles.mediaPlaceholderText}>
            {post.postType === 'short_video' ? '🎬' : post.postType === 'recipe_card' ? '🍽️' : '📷'}
          </Text>
        </View>
      )}

      {/* Caption */}
      {post.caption ? (
        <View style={styles.captionContainer}>
          <Text style={styles.caption} numberOfLines={3}>{post.caption}</Text>
        </View>
      ) : null}

      {/* Recipe title if linked */}
      {recipe ? (
        <View style={styles.recipeRow}>
          <Text style={styles.recipeLabel}>🍳 {recipe.title}</Text>
        </View>
      ) : null}

      {/* Utility actions (only for recipe-linked posts) */}
      <UtilityActionBar post={post} onAction={onUtilityAction} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden', marginBottom: Spacing.md },
  media: { width: '100%', height: 240 },
  mediaPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: BrandColors.muted + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholderText: { fontSize: 48 },
  captionContainer: { padding: Spacing.md, paddingBottom: Spacing.sm },
  caption: { fontSize: FontSize.sm, color: BrandColors.text, lineHeight: 20 },
  recipeRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  recipeLabel: { fontSize: FontSize.sm, color: BrandColors.primary },
});
