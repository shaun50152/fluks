import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Button } from '@/components/ui/Button';
import { useProfileStore } from '@/stores/profile.store';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

const NOTIFICATION_TYPES = [
  {
    icon: '🕐',
    title: 'Meal window reminders',
    description: '10 min before your meal time so you\'re never caught off guard.',
  },
  {
    icon: '📋',
    title: 'Prep-ahead reminders',
    description: 'Plan ahead for upcoming meals and reduce last-minute stress.',
  },
  {
    icon: '🔄',
    title: 'Adaptive schedule updates',
    description: 'Stay in sync when your schedule changes.',
  },
];

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(false);
  const { markOnboarded } = useProfileStore();

  const handleEnable = async () => {
    setLoading(true);
    try {
      await Notifications.requestPermissionsAsync();
      await markOnboarded();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await markOnboarded();
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Stay on track</Text>
        <Text style={styles.subtitle}>
          Enable notifications so FoodOS can keep you on schedule. You can adjust these anytime in Settings.
        </Text>
      </View>

      <View style={styles.list}>
        {NOTIFICATION_TYPES.map((item) => (
          <View key={item.title} style={styles.item}>
            <Text style={styles.itemIcon}>{item.icon}</Text>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Enable Notifications"
          accessibilityLabel="Enable push notifications"
          loading={loading}
          onPress={handleEnable}
          style={styles.primaryButton}
        />
        <Button
          label="Skip"
          variant="ghost"
          accessibilityLabel="Skip notifications setup"
          disabled={loading}
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
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: BrandColors.textSecondary,
    lineHeight: 24,
  },
  list: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BrandColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  itemIcon: {
    fontSize: FontSize.xl,
    lineHeight: 28,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: BrandColors.text,
    marginBottom: Spacing.xs,
  },
  itemDescription: {
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
    lineHeight: 20,
  },
  actions: { gap: Spacing.sm },
  primaryButton: { width: '100%' },
});
