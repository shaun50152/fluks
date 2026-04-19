import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Colors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
  Shadow,
  AnimationDuration,
} from '@/constants/theme';
import { getMissingIngredients } from '@/lib/pantry-utils';
import type { PantryItem, Recipe } from '@/types/domain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    setShortlist((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image */}
      <MotiView
        from={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: AnimationDuration.slow }}
        style={styles.heroContainer}
      >
        {recipe.mediaUrl ? (
          <>
            <Image
              source={{ uri: recipe.mediaUrl }}
              style={styles.heroImage}
              accessibilityLabel={`${recipe.title} photo`}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.9)']}
              style={styles.gradient}
            />
          </>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>🍽️</Text>
          </View>
        )}

        {/* Save Button Overlay */}
        <TouchableOpacity
          onPress={onSave}
          accessibilityLabel={isSaved ? 'Unsave recipe' : 'Save recipe'}
          accessibilityRole="button"
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>{isSaved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>

        {/* Title Overlay */}
        <View style={styles.titleOverlay}>
          <Text style={styles.title}>{recipe.title}</Text>
          <View style={styles.metaRow}>
            <MetaPill icon="⏱️" value={`${recipe.cookTime}m`} />
            <MetaPill icon="🔥" value={`${recipe.macros.calories}`} />
          </View>
        </View>
      </MotiView>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: AnimationDuration.normal, delay: 100 }}
          style={styles.tagsRow}
        >
          {recipe.tags.slice(0, 5).map((tag) => (
            <Badge key={tag} label={tag} variant="default" />
          ))}
        </MotiView>
      )}

      {/* Description */}
      {recipe.description && (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: AnimationDuration.normal, delay: 200 }}
          style={styles.section}
        >
          <Text style={styles.description}>{recipe.description}</Text>
        </MotiView>
      )}

      {/* Macros Card */}
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 300 }}
        style={styles.macrosCard}
      >
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <View style={styles.macrosGrid}>
          <MacroBar label="Protein" value={recipe.macros.protein} color={Colors.primary} />
          <MacroBar label="Carbs" value={recipe.macros.carbs} color={Colors.warning} />
          <MacroBar label="Fat" value={recipe.macros.fat} color={Colors.info} />
        </View>
      </MotiView>

      {/* Ingredients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {recipe.ingredients.map((ing, idx) => {
          const missing = missingSet.has(ing.name.toLowerCase().trim());
          return (
            <MotiView
              key={`${ing.name}-${idx}`}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: AnimationDuration.fast,
                delay: 400 + idx * 30,
              }}
            >
              <TouchableOpacity
                style={styles.ingredientRow}
                onPress={() => missing && addToShortlist(ing.name)}
                disabled={!missing}
              >
                <View style={[styles.ingredientDot, missing && styles.ingredientDotMissing]} />
                <Text style={[styles.ingredientText, missing && styles.ingredientTextMissing]}>
                  {ing.name}
                  {ing.quantity ? ` — ${ing.quantity}${ing.unit ? ` ${ing.unit}` : ''}` : ''}
                </Text>
                {missing && <Text style={styles.addIcon}>+</Text>}
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </View>

      {/* Shopping Shortlist */}
      {shortlist.length > 0 && (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          style={styles.shortlistCard}
        >
          <Text style={styles.shortlistTitle}>🛒 Shopping List</Text>
          {shortlist.map((item) => (
            <Text key={item} style={styles.shortlistItem}>
              • {item}
            </Text>
          ))}
        </MotiView>
      )}

      {/* Steps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preparation</Text>
        {recipe.steps
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((step, idx) => (
            <MotiView
              key={step.order}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: AnimationDuration.normal,
                delay: 500 + idx * 50,
              }}
              style={styles.stepCard}
            >
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.order}</Text>
              </View>
              <Text style={styles.stepText}>{step.instruction}</Text>
            </MotiView>
          ))}
      </View>

      {/* Start Cooking Button */}
      {onStartCooking && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, delay: 600 }}
          style={styles.cookButtonContainer}
        >
          <Button
            label="Start Cooking"
            onPress={onStartCooking}
            accessibilityLabel="Start cooking mode"
            size="lg"
          />
        </MotiView>
      )}
    </ScrollView>
  );
}

function MetaPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function MacroBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macroBar}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
  
  // Hero
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: SCREEN_WIDTH * 0.8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    fontSize: 80,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  saveButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 24,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
    lineHeight: 38,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  metaIcon: {
    fontSize: FontSize.sm,
  },
  metaValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
  },
  
  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  
  // Sections
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  
  // Macros
  macrosCard: {
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.md,
  },
  macrosGrid: {
    gap: Spacing.md,
  },
  macroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.textSecondary,
    width: 60,
  },
  macroBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  macroValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    width: 45,
    textAlign: 'right',
  },
  
  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success,
  },
  ingredientDotMissing: {
    backgroundColor: Colors.error,
  },
  ingredientText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  ingredientTextMissing: {
    color: Colors.textSecondary,
  },
  addIcon: {
    fontSize: FontSize.lg,
    color: Colors.primary,
    fontWeight: FontWeight.bold as any,
  },
  
  // Shortlist
  shortlistCard: {
    margin: Spacing.md,
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  shortlistTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  shortlistItem: {
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: 2,
  },
  
  // Steps
  stepCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    paddingTop: 4,
  },
  
  // Cook Button
  cookButtonContainer: {
    padding: Spacing.md,
  },
});
