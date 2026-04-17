import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useProfileStore } from '@/stores/profile.store';
import { usePantryStore } from '@/stores/pantry.store';
import { BrandColors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { Persona } from '@/types/domain';

interface PersonaOption {
  value: Persona;
  label: string;
  description: string;
}

const PERSONAS: PersonaOption[] = [
  { value: 'student', label: 'Student', description: 'Quick, budget-friendly meals for busy schedules' },
  { value: 'employee', label: 'Employee', description: 'Balanced meals for work days and meal prep' },
  { value: 'fitness', label: 'Fitness', description: 'High-protein meals to support your training' },
  { value: 'irregular', label: 'Irregular', description: 'Flexible eating for unpredictable schedules' },
];

export default function PersonaScreen() {
  const [selected, setSelected] = useState<Persona | null>(null);
  const { setPersona, isLoading } = useProfileStore();
  const { seedFromPersona } = usePantryStore();

  const handleContinue = async () => {
    if (!selected) return;
    await setPersona(selected);
    await seedFromPersona(selected);
    router.push('/(onboarding)/goals');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>
          Pick the profile that best fits your lifestyle so we can personalise your experience.
        </Text>
      </View>

      <View style={styles.cards}>
        {PERSONAS.map((persona) => {
          const isSelected = selected === persona.value;
          return (
            <TouchableOpacity
              key={persona.value}
              onPress={() => setSelected(persona.value)}
              accessibilityRole="radio"
              accessibilityLabel={persona.label}
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.8}
            >
              <Card shadow="sm" style={[styles.card, isSelected && styles.cardSelected]}>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {persona.label}
                </Text>
                <Text style={styles.cardDescription}>{persona.description}</Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button
        label="Continue"
        accessibilityLabel="Continue to goals"
        disabled={!selected}
        loading={isLoading}
        onPress={handleContinue}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold as any, color: BrandColors.text, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: BrandColors.textSecondary, lineHeight: 24 },
  cards: { gap: Spacing.md, marginBottom: Spacing.xl },
  card: { borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: BrandColors.primary, backgroundColor: '#F1F8F1' },
  cardLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold as any, color: BrandColors.text, marginBottom: Spacing.xs },
  cardLabelSelected: { color: BrandColors.primary },
  cardDescription: { fontSize: FontSize.sm, color: BrandColors.textSecondary, lineHeight: 20 },
});
