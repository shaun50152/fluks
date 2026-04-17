/**
 * CookingMode component — step-by-step guided cooking
 * Requirements: 6.2, 6.3
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwakeAsync,
} from 'expo-keep-awake';
import { Button } from '@/components/ui/Button';
import {
  BrandColors,
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
} from '@/constants/theme';
import { logEvent } from '@/lib/behavior-logger';
import type { RecipeStep } from '@/types/domain';

interface CookingModeProps {
  steps: RecipeStep[];
  recipeId: string;
  onComplete: () => void;
}

export function CookingMode({ steps, recipeId, onComplete }: CookingModeProps) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Keep screen awake while cooking
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwakeAsync();
    };
  }, []);

  const currentStep = sorted[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sorted.length - 1;

  function handleNext() {
    if (isLast) {
      logEvent('meal_completed', recipeId);
      setCompleted(true);
      onComplete();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    if (!isFirst) {
      setCurrentIndex((i) => i - 1);
    }
  }

  if (completed) {
    return (
      <View style={styles.completedContainer}>
        <Text style={styles.completedEmoji}>🎉</Text>
        <Text style={styles.completedTitle}>Meal complete!</Text>
        <Text style={styles.completedSub}>Great job cooking this recipe.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Step counter */}
      <Text style={styles.counter} accessibilityLabel={`Step ${currentIndex + 1} of ${sorted.length}`}>
        Step {currentIndex + 1} / {sorted.length}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / sorted.length) * 100}%` },
          ]}
        />
      </View>

      {/* Instruction */}
      <View style={styles.instructionCard}>
        <Text style={styles.instruction} accessibilityLiveRegion="polite">
          {currentStep.instruction}
        </Text>
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <Button
          label="← Back"
          variant="secondary"
          onPress={handlePrev}
          disabled={isFirst}
          accessibilityLabel="Previous step"
          style={styles.navBtn}
        />
        <Button
          label={isLast ? 'Finish ✓' : 'Next →'}
          variant="primary"
          onPress={handleNext}
          accessibilityLabel={isLast ? 'Finish cooking' : 'Next step'}
          style={styles.navBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  counter: {
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  progressTrack: {
    height: 6,
    backgroundColor: BrandColors.muted + '44',
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: BorderRadius.full,
  },
  instructionCard: {
    backgroundColor: BrandColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    minHeight: 180,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: Spacing.xl,
  },
  instruction: {
    fontSize: FontSize.lg,
    color: BrandColors.text,
    lineHeight: 28,
    textAlign: 'center',
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  navBtn: { flex: 1 },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: BrandColors.background,
  },
  completedEmoji: { fontSize: 72, marginBottom: Spacing.md },
  completedTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
    marginBottom: Spacing.sm,
  },
  completedSub: {
    fontSize: FontSize.md,
    color: BrandColors.textSecondary,
  },
});
