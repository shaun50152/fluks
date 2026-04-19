import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, AnimationDuration, Shadow } from '@/constants/theme';
import { useProfileStore } from '@/stores/profile.store';
import { useAuthStore } from '@/stores/auth.store';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useProfileStore();
  const { signOut } = useAuthStore();

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: AnimationDuration.slow }}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>👤</Text>
        </View>
        <Text style={styles.name}>Your Profile</Text>
        <Text style={styles.subtitle}>Manage your preferences and settings</Text>
      </MotiView>

      {/* Persona Card */}
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, delay: 100 }}
        style={styles.card}
      >
        <Text style={styles.cardTitle}>Persona</Text>
        <View style={styles.personaBadge}>
          <Text style={styles.personaEmoji}>
            {profile.persona === 'student' ? '🎓' : profile.persona === 'employee' ? '💼' : profile.persona === 'fitness' ? '💪' : '🌙'}
          </Text>
          <Text style={styles.personaText}>{profile.persona}</Text>
        </View>
      </MotiView>

      {/* Goals Card */}
      {profile.goals.length > 0 && (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, delay: 200 }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Goals</Text>
          <View style={styles.chipsRow}>
            {profile.goals.map((goal) => (
              <View key={goal} style={styles.chip}>
                <Text style={styles.chipText}>{goal.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </MotiView>
      )}

      {/* Dietary Preferences */}
      {profile.dietaryTags.length > 0 && (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, delay: 300 }}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Dietary Preferences</Text>
          <View style={styles.chipsRow}>
            {profile.dietaryTags.map((tag) => (
              <View key={tag} style={styles.chip}>
                <Text style={styles.chipText}>{tag.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        </MotiView>
      )}

      {/* Actions */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: AnimationDuration.normal, delay: 400 }}
        style={styles.actions}
      >
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Settings</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/pantry')}
        >
          <Text style={styles.actionIcon}>🥘</Text>
          <Text style={styles.actionText}>Manage Pantry</Text>
          <Text style={styles.actionChevron}>›</Text>
        </TouchableOpacity>

        <Button
          label="Sign Out"
          variant="ghost"
          onPress={signOut}
          style={styles.signOutButton}
        />
      </MotiView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  avatar: {
    fontSize: 48,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  
  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  personaEmoji: {
    fontSize: 32,
  },
  personaText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  
  // Actions
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
    color: Colors.text,
  },
  actionChevron: {
    fontSize: 24,
    color: Colors.textTertiary,
  },
  signOutButton: {
    marginTop: Spacing.md,
  },
});
