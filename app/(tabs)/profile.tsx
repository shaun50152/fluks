/**
 * Profile tab — profile header, goals, activity log, manual log form, settings link.
 * Requirements: 3.1, 3.6, 13.1, 13.5
 */
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useProfileStore } from '@/stores/profile.store';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { ActivityLog, Goal, Intensity } from '@/types/domain';

const GOAL_LABELS: Record<Goal, string> = {
  build_muscle: 'Build Muscle',
  lose_fat: 'Lose Fat',
  maintain: 'Maintain',
  improve_energy: 'Improve Energy',
  eat_cleaner: 'Eat Cleaner',
};

const INTENSITY_OPTIONS: Intensity[] = ['low', 'medium', 'high'];
const ACTIVITY_TYPES = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'Yoga', 'Walking', 'Other'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ManualLogForm({ userId, onLogged }: { userId: string; onLogged: () => void }) {
  const [activityType, setActivityType] = useState('Running');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) { setFormError('Enter a valid duration.'); return; }
    setSaving(true); setFormError(null);
    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId, activity_type: activityType, duration_min: durationNum,
      intensity: intensity ?? null, logged_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    setDuration(''); setIntensity(null); onLogged();
  }

  return (
    <Card style={styles.logForm}>
      <Text style={styles.sectionTitle}>Log Activity</Text>
      <Text style={styles.fieldLabel}>Activity Type</Text>
      <View style={styles.chipRow}>
        {ACTIVITY_TYPES.map((type) => (
          <TouchableOpacity key={type} onPress={() => setActivityType(type)}
            style={[styles.chip, activityType === type && styles.chipSelected]}
            accessibilityLabel={`Select ${type}`} accessibilityRole="button"
            accessibilityState={{ selected: activityType === type }}>
            <Text style={[styles.chipText, activityType === type && styles.chipTextSelected]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.fieldLabel}>Duration (minutes)</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration}
        keyboardType="numeric" placeholder="e.g. 30" placeholderTextColor={BrandColors.muted}
        accessibilityLabel="Duration in minutes" />
      <Text style={styles.fieldLabel}>Intensity (optional)</Text>
      <View style={styles.chipRow}>
        {INTENSITY_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt} onPress={() => setIntensity(intensity === opt ? null : opt)}
            style={[styles.chip, intensity === opt && styles.chipSelected]}
            accessibilityLabel={`Intensity ${opt}`} accessibilityRole="button"
            accessibilityState={{ selected: intensity === opt }}>
            <Text style={[styles.chipText, intensity === opt && styles.chipTextSelected]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
      <Button label="Log Activity" onPress={handleSubmit} loading={saving} accessibilityLabel="Log activity" style={styles.logButton} />
    </Card>
  );
}

function ProfileScreenContent() {
  const { profile, isLoading, error, fetchProfile } = useProfileStore();
  const { userId, session } = useAuthStore();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchLogs() {
    if (!userId) return;
    setLogsLoading(true);
    const { data } = await supabase.from('activity_logs').select('*')
      .eq('user_id', userId).order('logged_at', { ascending: false }).limit(7);
    setLogsLoading(false);
    if (data) {
      setActivityLogs(data.map((row: Record<string, unknown>) => ({
        id: row.id as string, userId: row.user_id as string,
        activityType: row.activity_type as string, durationMin: row.duration_min as number,
        intensity: (row.intensity as Intensity) ?? null, sourceId: (row.source_id as string) ?? null,
        loggedAt: row.logged_at as string,
      })));
    }
  }

  useEffect(() => { fetchLogs(); }, [userId]);

  if (isLoading) return <LoadingSpinner message="Loading profile…" />;
  if (error) return <ErrorCard title="Failed to load profile" message={error} onRetry={fetchProfile} />;

  const email = session?.user?.email ?? userId ?? 'User';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar} accessibilityLabel={`Avatar for ${email}`}>
          <Text style={styles.avatarText}>{email[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.displayName}>{email}</Text>
      </View>

      {/* Goals */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} accessibilityLabel="Edit goals" accessibilityRole="button">
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipRow}>
          {(profile?.goals ?? []).length === 0
            ? <Text style={styles.emptyText}>No goals set</Text>
            : (profile?.goals ?? []).map((g) => <Badge key={g} label={GOAL_LABELS[g]} variant="default" />)}
        </View>
      </View>

      {/* Activity Log */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {logsLoading
          ? <LoadingSpinner size="small" message="Loading activity…" />
          : activityLogs.length === 0
            ? <Text style={styles.emptyText}>No activity logged yet.</Text>
            : activityLogs.map((entry) => (
                <View key={entry.id} style={styles.logEntry}>
                  <View>
                    <Text style={styles.logType}>{entry.activityType}</Text>
                    <Text style={styles.logMeta}>{entry.durationMin} min{entry.intensity ? ` · ${entry.intensity}` : ''}</Text>
                  </View>
                  <Text style={styles.logDate}>{formatDate(entry.loggedAt)}</Text>
                </View>
              ))}
      </View>

      {userId ? <ManualLogForm userId={userId} onLogged={fetchLogs} /> : null}

      <TouchableOpacity style={styles.settingsLink} onPress={() => router.push('/settings')}
        accessibilityLabel="Go to settings" accessibilityRole="button">
        <Text style={styles.settingsLinkText}>⚙️  Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  return (
    <ErrorBoundary>
      <ProfileScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BrandColors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  header: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: BrandColors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold as any, color: BrandColors.textInverse },
  displayName: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold as any, color: BrandColors.text },
  section: { gap: Spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: BrandColors.text },
  editLink: { fontSize: FontSize.sm, color: BrandColors.primary, fontWeight: FontWeight.medium as any },
  emptyText: { fontSize: FontSize.sm, color: BrandColors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: BrandColors.muted + '88', backgroundColor: BrandColors.surface },
  chipSelected: { borderColor: BrandColors.primary, backgroundColor: BrandColors.primary + '18' },
  chipText: { fontSize: FontSize.sm, color: BrandColors.textSecondary },
  chipTextSelected: { color: BrandColors.primaryDark, fontWeight: FontWeight.semibold as any },
  logEntry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BrandColors.muted + '44' },
  logType: { fontSize: FontSize.sm, fontWeight: FontWeight.medium as any, color: BrandColors.text },
  logMeta: { fontSize: FontSize.xs, color: BrandColors.textSecondary },
  logDate: { fontSize: FontSize.xs, color: BrandColors.textSecondary },
  logForm: { gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium as any, color: BrandColors.textSecondary, marginTop: Spacing.xs },
  input: { borderWidth: 1, borderColor: BrandColors.muted + '88', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: BrandColors.text, backgroundColor: BrandColors.surface, minHeight: 44 },
  errorText: { fontSize: FontSize.sm, color: BrandColors.error },
  logButton: { marginTop: Spacing.xs },
  settingsLink: { paddingVertical: Spacing.md, alignItems: 'center' },
  settingsLinkText: { fontSize: FontSize.md, color: BrandColors.primary, fontWeight: FontWeight.medium as any },
});
