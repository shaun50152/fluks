import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { BrandColors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import type { Recipe, MealWindow } from '@/types/domain';

export interface DecisionCardProps {
  recipe: Recipe;
  mealWindow: MealWindow;
  missingIngredients: string[];
  onCookNow: () => void;
  onDismiss: () => void;
  onSave: () => void;
}

export function DecisionCard({
  recipe,
  mealWindow,
  missingIngredients,
  onCookNow,
  onDismiss,
  onSave,
}: DecisionCardProps) {
  return (
    <Card shadow="lg" style={styles.card}>
      {/* Media thumbnail */}
      {recipe.mediaUrl ? (
        <Image
          source={{ uri: recipe.mediaUrl }}
          style={styles.thumbnail}
          accessibilityLabel={`${recipe.title} thumbnail`}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailPlaceholderText}>🍽️</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Window label */}
        <Text style={styles.windowLabel}>{mealWindow.windowName.toUpperCase()}</Text>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>

        {/* Chips row */}
        <View style={styles.chipsRow}>
          <Badge label={`${recipe.cookTime} min`} variant="muted" />
          <Badge label={`${recipe.macros.calories} kcal`} variant="muted" />
          <Badge label={`${recipe.macros.protein}g protein`} variant="default" />
          {missingIngredients.length === 0 ? (
            <Badge label="Ready to cook" variant="success" />
          ) : (
            <Badge label={`${missingIngredients.length} missing`} variant="warning" />
          )}
        </View>

        {/* Macro summary */}
        <View style={styles.macroRow}>
          <MacroItem label="Carbs" value={`${recipe.macros.carbs}g`} />
          <MacroItem label="Fat" value={`${recipe.macros.fat}g`} />
          <MacroItem label="Protein" value={`${recipe.macros.protein}g`} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Cook Now"
            accessibilityLabel="Cook this recipe now"
            onPress={onCookNow}
            style={styles.cookButton}
          />
          <View style={styles.secondaryActions}>
            <Button
              label="Save"
              variant="secondary"
              accessibilityLabel="Save this recipe"
              onPress={onSave}
              style={styles.secondaryButton}
            />
            <Button
              label="Dismiss"
              variant="ghost"
              accessibilityLabel="Dismiss this suggestion"
              onPress={onDismiss}
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

function MacroItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroItem}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export function DecisionCardSkeleton() {
  return (
    <Card shadow="lg" style={styles.card}>
      <View style={[styles.thumbnailPlaceholder, styles.skeleton]} />
      <View style={styles.content}>
        <LoadingSpinner message="Finding your next meal..." />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', padding: 0 },
  thumbnail: { width: '100%', height: 200 },
  thumbnailPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: BrandColors.muted + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: { fontSize: 48 },
  skeleton: { backgroundColor: '#E0E0E0' },
  content: { padding: Spacing.md, gap: Spacing.sm },
  windowLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: BrandColors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold as any, color: BrandColors.text },
  macroLabel: { fontSize: FontSize.xs, color: BrandColors.textSecondary },
  actions: { gap: Spacing.sm },
  cookButton: { width: '100%' },
  secondaryActions: { flexDirection: 'row', gap: Spacing.sm },
  secondaryButton: { flex: 1 },
});
