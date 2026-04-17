import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores/profile.store';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { Goal } from '@/types/domain';

interface GoalOption {
  value: Goal;
  label: string;
}

const GOALS: GoalOption[] = [
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'lose_fat', label: 'Lose Fat' },
  { value: 'maintain', label: 'Maintain Weight' },
  { value: 'improve_energy', label: 'Improve Energy' },
  { value: 'eat_cleaner', label: 'Eat Cleaner' },
];

export default function GoalsScreen() {
  const [selected, setSelected] = useState<Goal[]>([]);
  const { setGoals, isLoading } = useProfileStore();

  const toggle = (goal: Goal) => {
    setSelected((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleContinue = async () => {
    await setGoals(selected);
    router.push('/(onboarding)/dietary');
  };

  const handleSkip = () => {
    router.push('/(onboarding)/dietary');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>What are your goals?</Text>
        <Text style={styles.subtitle}>Select all that apply. You can change these later.</Text>
      </View>

      <View style={styles.chips}>
        {GOALS.map((goal) => {
          const isSelected = selected.includes(goal.value);
          return (
            <TouchableOpacity
              key={goal.value}
              onPress={() => toggle(goal.value)}
              accessibilityRole="checkbox"
              accessibilityLabel={goal.label}
              accessibilityState={{ checked: isSelected }}
              activeOpacity={0.8}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {goal.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button
          label="Continue"
          accessibilityLabel="Continue to dietary preferences"
          loading={isLoading}
          onPress={handleContinue}
          style={styles.continueButton}
        />
        <Button
          label="Skip"
          variant="ghost"
          accessibilityLabel="Skip goals selection"
          onPress={handleSkip}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: BrandColors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: BrandColors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  chip: {
    backgroundColor: BrandColors.surface,
    borderWidth: 1.5,
    borderColor: BrandColors.muted,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: '#F1F8F1', borderColor: BrandColors.primary },
  chipText: { fontSize: FontSize.sm, color: BrandColors.text },
  chipTextSelected: { color: BrandColors.primary, fontWeight: FontWeight.semibold as any },
  actions: { gap: Spacing.sm },
  continueButton: { width: '100%' },
});
