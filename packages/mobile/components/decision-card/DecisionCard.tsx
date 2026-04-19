import React from 'react';
import { Image, StyleSheet, Text, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  Shadow,
  AnimationDuration,
} from '@/constants/theme';
import type { Recipe, MealWindow } from '@/types/domain';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;

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
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      style={styles.card}
    >
      {/* Hero Image with Gradient Overlay */}
      <View style={styles.heroContainer}>
        {recipe.mediaUrl ? (
          <Image
            source={{ uri: recipe.mediaUrl }}
            style={styles.heroImage}
            accessibilityLabel={`${recipe.title} image`}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderEmoji}>🍽️</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />
        
        {/* Window Badge */}
        <View style={styles.windowBadge}>
          <Text style={styles.windowText}>{mealWindow.windowName}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatPill icon="⏱️" value={`${recipe.cookTime}m`} />
          <StatPill icon="🔥" value={`${recipe.macros.calories}`} />
          <StatPill icon="💪" value={`${recipe.macros.protein}g`} />
          {missingIngredients.length === 0 && (
            <Badge label="Ready" variant="success" />
          )}
        </View>

        {/* Macros */}
        <View style={styles.macroCard}>
          <MacroBar label="Protein" value={recipe.macros.protein} color={Colors.primary} />
          <MacroBar label="Carbs" value={recipe.macros.carbs} color={Colors.warning} />
          <MacroBar label="Fat" value={recipe.macros.fat} color={Colors.info} />
        </View>

        {/* Missing Ingredients Alert */}
        {missingIngredients.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: AnimationDuration.normal, delay: 200 }}
            style={styles.missingAlert}
          >
            <Text style={styles.missingText}>
              Missing {missingIngredients.length} ingredient{missingIngredients.length > 1 ? 's' : ''}
            </Text>
          </MotiView>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Cook Now"
            accessibilityLabel="Start cooking this recipe"
            onPress={onCookNow}
            size="lg"
          />
          <View style={styles.secondaryActions}>
            <Button
              label="Save"
              variant="secondary"
              accessibilityLabel="Save recipe for later"
              onPress={onSave}
              style={styles.secondaryButton}
            />
            <Button
              label="Skip"
              variant="ghost"
              accessibilityLabel="Show next suggestion"
              onPress={onDismiss}
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </View>
    </MotiView>
  );
}

function StatPill({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
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

export function DecisionCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.heroPlaceholder} />
      <View style={styles.content}>
        <LoadingSpinner message="Finding your perfect meal..." />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    ...Shadow.xl,
  },
  skeleton: {
    minHeight: 500,
    justifyContent: 'center',
  },
  
  // Hero
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
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
  heroPlaceholderEmoji: {
    fontSize: 64,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  windowBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  windowText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  
  // Content
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    lineHeight: 32,
  },
  
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statIcon: {
    fontSize: FontSize.sm,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  
  // Macros
  macroCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  macroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  macroLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
    color: Colors.textSecondary,
    width: 50,
  },
  macroBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  macroValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    width: 40,
    textAlign: 'right',
  },
  
  // Missing Alert
  missingAlert: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  missingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: Colors.warning,
    textAlign: 'center',
  },
  
  // Actions
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
});
