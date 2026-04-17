/**
 * RecipeDetail component
 * Requirements: 6.1, 6.4, 6.5, 6.6
 */
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  BrandColors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
} from '@/constants/theme';
import { getMissingIngredients } from '@/lib/pantry-utils';
import type { PantryItem, Recipe } from '@/types/domain';

interface RecipeDetailProps {
  recipe: Recipe;
  pantryItems: PantryItem[];
  onSave: () => void;
  isSaved: boolean;
  onStartCooking?: () => void;
}

export function RecipeDetail({
  recipe,
  pantryItems,
  onSave,
  isSaved,
  onStartCooking,
}: RecipeDetailProps) {
  const [shortlist, setShortlist] = useState<string[]>([]);

  const missingSet = new Set(
    getMissingIngredients(recipe.ingredients, pantryItems).map((n) =>
      n.toLowerCase().trim()
    )
  );

  function addToShortlist(name: string) {
    setShortlist((prev) =>
      prev.includes(name) ? prev : [...prev, name]
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Media */}
      {recipe.mediaUrl ? (
        <Image
          source={{ uri: recipe.mediaUrl }}
          style={styles.media}
          accessibilityLabel={`${recipe.title} photo`}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.media, styles.mediaPlaceholder]}>
          <Text style={styles.mediaPlaceholderText}>🍽️</Text>
        </View>
      )}

      {/* Title + save */}
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {recipe.title}
        </Text>
        <TouchableOpacity
          onPress={onSave}
          accessibilityLabel={isSaved ? 'Unsave recipe' : 'Save recipe'}
          accessibilityRole="button"
          style={styles.saveBtn}
        >
          <Text style={styles.saveBtnText}>{isSaved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Cook time */}
      <View style={styles.metaRow}>
        <Badge label={`⏱ ${recipe.cookTime} min`} variant="muted" />
        {recipe.tags.map((tag) => (
          <Badge key={tag} label={tag} variant="default" />
        ))}
      </View>

      {/* Description */}
      {recipe.description ? (
        <Text style={styles.description}>{recipe.description}</Text>
      ) : null}

      {/* Macros */}
      <Card style={styles.macrosCard}>
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <View style={styles.macrosRow}>
          <MacroCell label="Calories" value={`${recipe.macros.calories}`} />
          <MacroCell label="Protein" value={`${recipe.macros.protein}g`} />
          <MacroCell label="Carbs" value={`${recipe.macros.carbs}g`} />
          <MacroCell label="Fat" value={`${recipe.macros.fat}g`} />
        </View>
      </Card>

      {/* Ingredients */}
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients.map((ing, idx) => {
        const missing = missingSet.has(ing.name.toLowerCase().trim());
        return (
          <TouchableOpacity
            key={`${ing.name}-${idx}`}
            style={styles.ingredientRow}
            onPress={() => missing && addToShortlist(ing.name)}
            accessibilityLabel={
              missing
                ? `${ing.name} — not in pantry, tap to add to shopping list`
                : `${ing.name} — in pantry`
            }
            accessibilityRole="button"
            disabled={!missing}
          >
            <Text style={styles.ingredientIndicator}>
              {missing ? '❌' : '✅'}
            </Text>
            <Text style={[styles.ingredientName, missing && styles.ingredientMissing]}>
              {ing.name}
              {ing.quantity ? ` — ${ing.quantity}${ing.unit ? ` ${ing.unit}` : ''}` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Shopping shortlist */}
      {shortlist.length > 0 ? (
        <Card style={styles.shortlistCard}>
          <Text style={styles.sectionTitle}>Shopping shortlist</Text>
          {shortlist.map((item) => (
            <Text key={item} style={styles.shortlistItem}>
              • {item}
            </Text>
          ))}
        </Card>
      ) : null}

      {/* Steps */}
      <Text style={styles.sectionTitle}>Steps</Text>
      {recipe.steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((step) => (
          <View key={step.order} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{step.order}</Text>
            </View>
            <Text style={styles.stepInstruction}>{step.instruction}</Text>
          </View>
        ))}

      {/* Start cooking */}
      {onStartCooking ? (
        <Button
          label="Start Cooking"
          variant="primary"
          onPress={onStartCooking}
          accessibilityLabel="Start cooking mode"
          style={styles.cookBtn}
        />
      ) : null}
    </ScrollView>
  );
}

function MacroCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { paddingBottom: Spacing.xxl },
  media: {
    width: '100%',
    height: 240,
    backgroundColor: BrandColors.muted + '33',
  },
  mediaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholderText: { fontSize: 64 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
  },
  saveBtn: { padding: Spacing.sm, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 24 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  description: {
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    lineHeight: 20,
  },
  macrosCard: { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.sm },
  macroCell: { alignItems: 'center' },
  macroValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.primary,
  },
  macroLabel: { fontSize: FontSize.xs, color: BrandColors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: BrandColors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  ingredientIndicator: { fontSize: 16 },
  ingredientName: { fontSize: FontSize.sm, color: BrandColors.text, flex: 1 },
  ingredientMissing: { color: BrandColors.textSecondary },
  shortlistCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: BrandColors.warning + '11',
  },
  shortlistItem: {
    fontSize: FontSize.sm,
    color: BrandColors.text,
    paddingVertical: 2,
  },
  stepRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepBadgeText: {
    color: BrandColors.textInverse,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold as any,
  },
  stepInstruction: {
    flex: 1,
    fontSize: FontSize.sm,
    color: BrandColors.text,
    lineHeight: 20,
    paddingTop: 4,
  },
  cookBtn: { marginHorizontal: Spacing.md, marginTop: Spacing.lg },
});
