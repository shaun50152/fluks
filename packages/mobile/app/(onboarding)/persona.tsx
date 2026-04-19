import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Button } from '@/components/ui/Button';
import { PersonaCard } from '@/components/onboarding/PersonaCard';
import { Colors, FontSize, FontWeight, Spacing, AnimationDuration } from '@/constants/theme';
import { useProfileStore } from '@/stores/profile.store';
import { usePantryStore } from '@/stores/pantry.store';
import type { Persona } from '@/types/domain';

const PERSONAS: Array<{
  value: Persona;
  emoji: string;
  title: string;
  description: string;
}> = [
  {
    value: 'student',
    emoji: '🎓',
    title: 'Student',
    description: 'Quick meals, budget-friendly, dorm-friendly recipes',
  },
  {
    value: 'employee',
    emoji: '💼',
    title: 'Professional',
    description: 'Meal prep, work lunches, efficient cooking',
  },
  {
    value: 'fitness',
    emoji: '💪',
    title: 'Fitness',
    description: 'High protein, macro tracking, performance nutrition',
  },
  {
    value: 'irregular',
    emoji: '🌙',
    title: 'Flexible',
    description: 'Varied schedule, adaptable meal times',
  },
];

export default function PersonaScreen() {
  const [selected, setSelected] = useState<Persona | null>(null);
  const router = useRouter();
  const { setPersona } = useProfileStore();
  const { seedFromPersona } = usePantryStore();

  async function handleContinue() {
    if (!selected) return;

    await setPersona(selected);
    await seedFromPersona(selected);
    router.push('/(onboarding)/goals');
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
          <Text style={styles.title}>Choose your persona</Text>
          <Text style={styles.subtitle}>
            We'll customize your experience based on your lifestyle
          </Text>
        </MotiView>

        {/* Persona Cards */}
        <View style={styles.grid}>
          {PERSONAS.map((persona, index) => (
            <MotiView
              key={persona.value}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: 'timing',
                duration: AnimationDuration.slow,
                delay: 100 + index * 50,
              }}
              style={styles.cardWrapper}
            >
              <PersonaCard
                persona={persona.value}
                emoji={persona.emoji}
                title={persona.title}
                description={persona.description}
                isSelected={selected === persona.value}
                onSelect={() => setSelected(persona.value)}
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
          label="Continue"
          onPress={handleContinue}
          disabled={!selected}
          size="lg"
        />
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
  grid: {
    gap: Spacing.md,
  },
  cardWrapper: {
    // Wrapper for animation
  },
  footer: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
