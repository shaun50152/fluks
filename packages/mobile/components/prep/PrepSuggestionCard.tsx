import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { logEvent } from '@/lib/behavior-logger';
import type { PantryItem, PrepSuggestion } from '@/types/domain';

interface PrepSuggestionCardProps {
  suggestion: PrepSuggestion;
  pantryItems: PantryItem[];
  onConfirm: (suggestion: PrepSuggestion, missingIngredients: string[]) => void;
  onDismiss: (suggestion: PrepSuggestion) => void;
}

function getMissingIngredients(suggestion: PrepSuggestion, pantryItems: PantryItem[]): string[] {
  const pantryNames = new Set(pantryItems.map((p) => p.name.toLowerCase()));
  return suggestion.recipe.ingredients
    .map((i) => i.name)
    .filter((name) => !pantryNames.has(name.toLowerCase()));
}

function formatDatetime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PrepSuggestionCard({
  suggestion,
  pantryItems,
  onConfirm,
  onDismiss,
}: PrepSuggestionCardProps) {
  const { recipe, targetDatetime } = suggestion;
  const missingIngredients = getMissingIngredients(suggestion, pantryItems);

  function handleConfirm() {
    logEvent('prep_confirmed', suggestion.id, { recipeId: suggestion.recipeId });
    onConfirm(suggestion, missingIngredients);
  }

  function handleDismiss() {
    logEvent('suggestion_dismiss', suggestion.id, { recipeId: suggestion.recipeId });
    onDismiss({ ...suggestion, dismissedAt: new Date().toISOString() });
  }

  return (
    <Card shadow="md" style={styles.card}>
      {/* Header: meal time */}
      <Text style={styles.datetime}>{formatDatetime(targetDatetime)}</Text>

      {/* Recipe name */}
      <Text style={styles.recipeName}>{recipe.title}</Text>

      {/* Prep duration */}
      <Badge label={`${recipe.cookTime} min prep`} variant="default" style={styles.badge} />

      {/* Ingredients */}
      <Text style={styles.sectionLabel}>Ingredients</Text>
      <View style={styles.ingredientList}>
        {recipe.ingredients.map((ingredient) => {
          const isMissing = missingIngredients.includes(ingredient.name);
          return (
            <View key={ingredient.name} style={styles.ingredientRow}>
              <Text style={[styles.ingredientName, isMissing && styles.missingIngredient]}>
                {ingredient.name}
              </Text>
              {isMissing && <Badge label="needed" variant="warning" />}
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Confirm"
          variant="primary"
          accessibilityLabel={`Confirm prep for ${recipe.title}`}
          onPress={handleConfirm}
          style={styles.confirmButton}
        />
        <Button
          label="Dismiss"
          variant="ghost"
          accessibilityLabel={`Dismiss prep suggestion for ${recipe.title}`}
          onPress={handleDismiss}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  datetime: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  recipeName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  badge: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  ingredientList: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientName: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flex: 1,
  },
  missingIngredient: {
    color: Colors.warning,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  confirmButton: {
    flex: 1,
  },
});
