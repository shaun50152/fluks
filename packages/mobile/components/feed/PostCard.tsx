import React from 'react';
import { Image, StyleSheet, Text, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { UtilityActionBar } from '@/components/feed/UtilityActionBar';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadow,
  AnimationDuration,
} from '@/constants/theme';
import type { PantryItem, Post, Recipe, UtilityAction } from '@/types/domain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PostCardProps {
  post: Post;
  recipe: Recipe | null;
  pantryItems: PantryItem[];
  onUtilityAction: (action: UtilityAction, post: Post) => void;
  index?: number;
}

export function PostCard({
  post,
  recipe,
  pantryItems: _pantryItems,
  onUtilityAction,
  index = 0,
}: PostCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: AnimationDuration.slow,
        delay: index * 100,
      }}
      style={styles.card}
    >
      {/* Media */}
      <View style={styles.mediaContainer}>
        {post.mediaUrl ? (
          <>
            <Image
              source={{ uri: post.mediaUrl }}
              style={styles.media}
              accessibilityLabel={post.caption ?? 'Post image'}
              resizeMode="cover"
            />
            {post.caption && (
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
              />
            )}
          </>
        ) : (
          <View style={styles.mediaPlaceholder}>
            <Text style={styles.mediaPlaceholderText}>
              {post.postType === 'short_video' ? '🎬' : post.postType === 'recipe_card' ? '🍽️' : '📷'}
            </Text>
          </View>
        )}

        {/* Post Type Badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {post.postType === 'short_video' ? 'Video' : post.postType === 'recipe_card' ? 'Recipe' : 'Photo'}
          </Text>
        </View>

        {/* Caption Overlay */}
        {post.caption && (
          <View style={styles.captionOverlay}>
            <Text style={styles.caption} numberOfLines={2}>
              {post.caption}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Recipe Info */}
        {recipe && (
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeEmoji}>🍳</Text>
            <View style={styles.recipeText}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {recipe.title}
              </Text>
              <View style={styles.recipeStats}>
                <Text style={styles.recipeStat}>⏱️ {recipe.cookTime}m</Text>
                <Text style={styles.recipeStat}>•</Text>
                <Text style={styles.recipeStat}>🔥 {recipe.macros.calories} kcal</Text>
              </View>
            </View>
          </View>
        )}

        {/* Engagement Stats */}
        <View style={styles.engagementRow}>
          <EngagementStat icon="👁️" value={post.viewCount} />
          <EngagementStat icon="❤️" value={post.likeCount} />
          <EngagementStat icon="📤" value={post.shareCount} />
        </View>

        {/* Utility Actions */}
        {recipe && <UtilityActionBar post={post} onAction={onUtilityAction} />}
      </View>
    </MotiView>
  );
}

function EngagementStat({ icon, value }: { icon: string; value: number }) {
  return (
    <View style={styles.engagementStat}>
      <Text style={styles.engagementIcon}>{icon}</Text>
      <Text style={styles.engagementValue}>{formatNumber(value)}</Text>
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  
  // Media
  mediaContainer: {
    position: 'relative',
    width: '100%',
    height: SCREEN_WIDTH * 0.75, // 4:3 aspect ratio
  },
  media: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholderText: {
    fontSize: 64,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  
  // Badges
  typeBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  
  // Caption
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  caption: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  
  // Content
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  
  // Recipe Info
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  recipeEmoji: {
    fontSize: 24,
  },
  recipeText: {
    flex: 1,
    gap: 4,
  },
  recipeTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  recipeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  recipeStat: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  
  // Engagement
  engagementRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  engagementStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  engagementIcon: {
    fontSize: FontSize.sm,
  },
  engagementValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.textSecondary,
  },
});
