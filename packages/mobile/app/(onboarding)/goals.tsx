import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Button } from '@/components/ui/Button';
import { SelectableChip } from '@/components/onboarding/SelectableChip';
import { Colors, FontSize, FontWeight, Spacing, AnimationDuration } from '@/constants/theme';
import { useProfileStore } from '@/stores/profile.store';
import type { Goal } from '@/types/domain';

const GOALS: Array<{ value: Goal; label: string; emoji: string }> = [
  { value: 'build_muscle', label: 'Build Muscle', emoji: '💪' },
  { value: 'lose_fat', label: 'Lose Fat', emoji: '🔥' },
  { value: 'maintain', label: 'Maintain', emoji: '⚖️' },
  { value: 'improve_energy', label: 'Improve Energy', emoji: '⚡' },
  { value: 'eat_cleaner', label: 'Eat Cleaner', emoji: '🥗' },
];

export default function GoalsScreen() {
  const [selected, setSelected] = useState<Goal[]>([]);
  const router = useRouter();
  const { setGoals } = useProfileStore();

  function toggleGoal(goal: Goal) {
    setSelected((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  async function handleContinue() {
    await setGoals(selected);
    router.push('/(onboarding)/dietary');
  }

  function handleSkip() {
    router.push('/(onboarding)/dietary');
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: AnimationDuration.slow }}
          style={styles.header}
        >
          <Text style={styles.title}>What are your goals?</Text>
          <Text style={styles.subtitle}>
            Select all that apply. We'll tailor recommendations to help you achieve them.
          </Text>
        </MotiView>

        {/* Goal Chips */}
        <View style={styles.chipsContainer}>
          {GOALS.map((goal, index) => (
            <MotiView
              key={goal.value}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: AnimationDuration.normal,
                delay: 100 + index * 50,
              }}
            >
              <SelectableChip
                label={goal.label}
                emoji={goal.emoji}
                isSelected={selected.includes(goal.value)}
                onToggle={() => toggleGoal(goal.value)}
              />
            </MotiView>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: AnimationDuration.slow,
          delay: 400,
        }}
        style={styles.footer}
      >
        <Button
          label={selected.length > 0 ? 'Continue' : 'Skip'}
          onPress={selected.length > 0 ? handleContinue : handleSkip}
          size="lg"
        />
        {selected.length > 0 && (
          <Button
            label="Skip"
            variant="ghost"
            onPress={handleSkip}
          />
        )}
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
