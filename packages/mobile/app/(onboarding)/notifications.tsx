import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import * as Notifications from 'expo-notifications';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, AnimationDuration } from '@/constants/theme';
import { useProfileStore } from '@/stores/profile.store';

const NOTIFICATION_BENEFITS = [
  { emoji: '⏰', title: 'Meal reminders', description: 'Get notified when it\'s time to eat' },
  { emoji: '🥘', title: 'Prep suggestions', description: 'Plan ahead for upcoming meals' },
  { emoji: '📊', title: 'Goal tracking', description: 'Stay on track with your nutrition goals' },
];

export default function NotificationsScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { markOnboarded } = useProfileStore();

  async function handleEnable() {
    setIsLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await Notifications.getExpoPushTokenAsync();
      }
    } catch (error) {
      console.warn('Notification permission error:', error);
    } finally {
      setIsLoading(false);
      await completeOnboarding();
    }
  }

  async function handleSkip() {
    await completeOnboarding();
  }

  async function completeOnboarding() {
    await markOnboarded();
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={styles.hero}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
          </View>
        </MotiView>

        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: AnimationDuration.slow, delay: 100 }}
          style={styles.header}
        >
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.subtitle}>
            Enable notifications to get the most out of FoodOS
          </Text>
        </MotiView>

        {/* Benefits */}
        <View style={styles.benefits}>
          {NOTIFICATION_BENEFITS.map((benefit, index) => (
            <MotiView
              key={benefit.title}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: AnimationDuration.normal,
                delay: 200 + index * 100,
              }}
              style={styles.benefitCard}
            >
              <Text style={styles.benefitEmoji}>{benefit.emoji}</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
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
          delay: 600,
        }}
        style={styles.footer}
      >
        <Button
          label="Enable notifications"
          onPress={handleEnable}
          loading={isLoading}
          size="lg"
        />
        <Button
          label="Maybe later"
          variant="ghost"
          onPress={handleSkip}
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
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  benefits: {
    gap: Spacing.md,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  benefitEmoji: {
    fontSize: 32,
  },
  benefitText: {
    flex: 1,
    gap: 4,
  },
  benefitTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  benefitDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
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
