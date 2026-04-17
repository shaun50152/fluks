import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrandColors, BorderRadius, FontSize, Spacing } from '@/constants/theme';
import type { Post, UtilityAction } from '@/types/domain';

interface UtilityActionBarProps {
  post: Post;
  onAction: (action: UtilityAction, post: Post) => void;
}

interface ActionItem {
  action: UtilityAction;
  label: string;
  icon: string;
}

const ACTIONS: ActionItem[] = [
  { action: 'cook_now', label: 'Cook Now', icon: '🍳' },
  { action: 'save_recipe', label: 'Save', icon: '🔖' },
  { action: 'add_to_prep_list', label: 'Prep', icon: '📋' },
  { action: 'see_missing_ingredients', label: 'Missing', icon: '🛒' },
];

/**
 * Renders utility action buttons for posts linked to a recipe.
 * Only shown when post.recipeId is non-null.
 * Requirements: 10.5, 10.6, 20.1
 */
export function UtilityActionBar({ post, onAction }: UtilityActionBarProps) {
  if (!post.recipeId) return null;

  return (
    <View style={styles.container}>
      {ACTIONS.map(({ action, label, icon }) => (
        <TouchableOpacity
          key={action}
          style={styles.button}
          onPress={() => onAction(action, post)}
          accessibilityLabel={label}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: BrandColors.muted + '33',
  },
  button: {
    alignItems: 'center',
    gap: 2,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xs,
  },
  icon: { fontSize: 18 },
  label: { fontSize: FontSize.xs, color: BrandColors.textSecondary },
});
