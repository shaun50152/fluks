import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Button } from '@/components/ui/Button';
import { SelectableChip } from '@/components/onboarding/SelectableChip';
import { Colors, FontSize, FontWeight, Spacing, AnimationDuration } from '@/constants/theme';
import { useProfileStore } from '@/stores/profile.store';
import type { DietaryTag } from '@/types/domain';

const DIETARY_TAGS: Array<{ value: DietaryTag; label: string; emoji: string }> = [
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥕' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
  { value: 'dairy_free', label: 'Dairy Free', emoji: '🥛' },
  { value: 'halal', label: 'Halal', emoji: '☪️' },
  { value: 'kosher', label: 'Kosher', emoji: '✡️' },
  { value: 'nut_free', label: 'Nut Free', emoji: '🥜' },
];

export default function DietaryScreen() {
  const [selected, setSelected] = useState<DietaryTag[]>([]);
  const router = useRouter();
  const { setDietaryTags } = useProfileStore();

  function toggleTag(tag: DietaryTag) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleContinue() {
    await setDietaryTags(selected);
    router.push('/(onboarding)/notifications');
  }

  function handleSkip() {
    router.push('/(onboarding)/notifications');
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
          <Text style={styles.title}>Dietary preferences</Text>
          <Text style={styles.subtitle}>
            We'll filter out recipes that don't match your dietary needs.
          </Text>
        </MotiView>

        {/* Dietary Chips */}
        <View style={styles.chipsContainer}>
          {DIETARY_TAGS.map((tag, index) => (
            <MotiView
              key={tag.value}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 200,
                delay: 100 + index * 50,
              }}
            >
              <SelectableChip
                label={tag.label}
                emoji={tag.emoji}
                isSelected={selected.includes(tag.value)}
                onToggle={() => toggleTag(tag.value)}
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
          delay: 500,
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
