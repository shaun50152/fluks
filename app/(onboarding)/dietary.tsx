import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores/profile.store';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { DietaryTag } from '@/types/domain';

interface DietaryOption {
  value: DietaryTag;
  label: string;
}

const DIETARY_TAGS: DietaryOption[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten Free' },
  { value: 'dairy_free', label: 'Dairy Free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'nut_free', label: 'Nut Free' },
];

export default function DietaryScreen() {
  const [selected, setSelected] = useState<DietaryTag[]>([]);
  const { setDietaryTags, isLoading } = useProfileStore();

  const toggle = (tag: DietaryTag) => {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleContinue = async () => {
    await setDietaryTags(selected);
    router.push('/(onboarding)/notifications');
  };

  const handleSkip = () => {
    router.push('/(onboarding)/notifications');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Any dietary preferences?</Text>
        <Text style={styles.subtitle}>We'll filter out recipes that don't fit. You can change these later.</Text>
      </View>

      <View style={styles.chips}>
        {DIETARY_TAGS.map((tag) => {
          const isSelected = selected.includes(tag.value);
          return (
            <TouchableOpacity
              key={tag.value}
              onPress={() => toggle(tag.value)}
              accessibilityRole="checkbox"
              accessibilityLabel={tag.label}
              accessibilityState={{ checked: isSelected }}
              activeOpacity={0.8}
              style={[styles.chip, isSelected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button
          label="Continue"
          accessibilityLabel="Continue to notifications"
          loading={isLoading}
          onPress={handleContinue}
          style={styles.continueButton}
        />
        <Button
          label="Skip"
          variant="ghost"
          accessibilityLabel="Skip dietary preferences"
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
  subtitle: { fontSize: FontSize.md, color: BrandColors.textSecondary, lineHeight: 24 },
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
