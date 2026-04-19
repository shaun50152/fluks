/**
 * Settings screen — notification toggles, quiet hours, schedule viewer,
 * behavior export, and account deletion.
 * Requirements: 7.5, 12.6, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { useScheduleStore } from '@/stores/schedule.store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import type { NotificationCategory, MealWindow } from '@/types/domain';

// ── Types ────────────────────────────────────────────────────────
interface NotificationSetting {
  category: NotificationCategory;
  enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const NOTIFICATION_CATEGORIES: { key: NotificationCategory; label: string; description: string }[] = [
  { key: 'meal_window', label: 'Meal Window', description: 'Reminders when your meal window opens' },
  { key: 'prep_reminder', label: 'Prep Reminder', description: 'Suggestions to prep meals in advance' },
  { key: 'social_activity', label: 'Social Activity', description: 'Likes, comments, and follows' },
  { key: 'adaptive_schedule', label: 'Adaptive Schedule', description: 'Schedule drift and update alerts' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Helpers ──────────────────────────────────────────────────────
function validateTimeFormat(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

// ── Sub-components ───────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({ label, description, value, onValueChange }: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border + '44', true: Colors.primaryLight }}
        thumbColor={value ? Colors.primary : Colors.border}
        accessibilityLabel={`Toggle ${label} notifications`}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

function MealWindowRow({ window: w, onEdit, onSetManual }: {
  window: MealWindow;
  onEdit: (id: string, patch: Partial<Pick<MealWindow, 'windowName' | 'startTime' | 'endTime'>>) => void;
  onSetManual: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(w.windowName);
  const [start, setStart] = useState(w.startTime);
  const [end, setEnd] = useState(w.endTime);
  const [err, setErr] = useState<string | null>(null);

  function handleSave() {
    if (!validateTimeFormat(start) || !validateTimeFormat(end)) {
      setErr('Use HH:MM format (e.g. 08:00)');
      return;
    }
    setErr(null);
    onEdit(w.id, { windowName: name, startTime: start, endTime: end });
    setEditing(false);
  }

  return (
    <View style={styles.mealWindowRow}>
      <View style={styles.mealWindowHeader}>
        <Text style={styles.mealWindowDay}>{DAY_NAMES[w.dayOfWeek]}</Text>
        {w.isManualOverride && (
          <Text style={styles.manualBadge}>Manual</Text>
        )}
        <TouchableOpacity onPress={() => setEditing(!editing)} accessibilityLabel={`Edit ${w.windowName}`} accessibilityRole="button">
          <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.editForm}>
          <TextInput
            style={styles.timeInput}
            value={name}
            onChangeText={setName}
            placeholder="Window name"
            placeholderTextColor={Colors.textSecondary}
            accessibilityLabel="Window name"
          />
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.timeInput, styles.timeInputHalf]}
              value={start}
              onChangeText={setStart}
              placeholder="08:00"
              placeholderTextColor={Colors.textSecondary}
              accessibilityLabel="Start time"
            />
            <Text style={styles.timeSep}>–</Text>
            <TextInput
              style={[styles.timeInput, styles.timeInputHalf]}
              value={end}
              onChangeText={setEnd}
              placeholder="09:00"
              placeholderTextColor={Colors.textSecondary}
              accessibilityLabel="End time"
            />
          </View>
          {err ? <Text style={styles.errorText}>{err}</Text> : null}
          <View style={styles.editActions}>
            <Button label="Save" onPress={handleSave} accessibilityLabel="Save meal window" style={styles.saveBtn} />
            {!w.isManualOverride && (
              <Button
                label="Set Manual"
                variant="secondary"
                onPress={() => onSetManual(w.id)}
                accessibilityLabel="Set as manual override"
                style={styles.saveBtn}
              />
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.mealWindowTime}>{w.windowName}: {w.startTime} – {w.endTime}</Text>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────
export default function SettingsScreen() {
  const { userId, signOut } = useAuthStore();
  const { mealWindows, fetchSchedule, updateMealWindow, setManualOverride } = useScheduleStore();

  const [notifSettings, setNotifSettings] = useState<Record<NotificationCategory, NotificationSetting>>({
    meal_window: { category: 'meal_window', enabled: true, quiet_hours_start: null, quiet_hours_end: null },
    prep_reminder: { category: 'prep_reminder', enabled: true, quiet_hours_start: null, quiet_hours_end: null },
    social_activity: { category: 'social_activity', enabled: true, quiet_hours_start: null, quiet_hours_end: null },
    adaptive_schedule: { category: 'adaptive_schedule', enabled: true, quiet_hours_start: null, quiet_hours_end: null },
  });
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchSchedule();
    loadNotificationSettings();
  }, [userId]);

  async function loadNotificationSettings() {
    if (!userId) return;
    const { data } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId);

    if (data && data.length > 0) {
      const updated = { ...notifSettings };
      for (const row of data) {
        const cat = row.category as NotificationCategory;
        if (updated[cat]) {
          updated[cat] = {
            category: cat,
            enabled: row.enabled ?? true,
            quiet_hours_start: row.quiet_hours_start ?? null,
            quiet_hours_end: row.quiet_hours_end ?? null,
          };
        }
      }
      setNotifSettings(updated);
      // Use quiet hours from first row that has them
      const withQuiet = data.find((r) => r.quiet_hours_start);
      if (withQuiet) {
        setQuietStart(withQuiet.quiet_hours_start);
        setQuietEnd(withQuiet.quiet_hours_end);
        setQuietEnabled(true);
      }
    }
  }

  async function toggleCategory(category: NotificationCategory, enabled: boolean) {
    if (!userId) return;
    setNotifLoading(true);
    const qStart = quietEnabled ? quietStart : null;
    const qEnd = quietEnabled ? quietEnd : null;

    await supabase.from('user_notification_settings').upsert(
      { user_id: userId, category, enabled, quiet_hours_start: qStart, quiet_hours_end: qEnd },
      { onConflict: 'user_id,category' }
    );

    setNotifSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], enabled },
    }));
    setNotifLoading(false);
  }

  async function saveQuietHours() {
    if (!userId) return;
    if (!validateTimeFormat(quietStart) || !validateTimeFormat(quietEnd)) {
      Alert.alert('Invalid time', 'Use HH:MM format (e.g. 22:00)');
      return;
    }
    setNotifLoading(true);
    const qStart = quietEnabled ? quietStart : null;
    const qEnd = quietEnabled ? quietEnd : null;

    // Update all categories with the same quiet hours
    const upserts = NOTIFICATION_CATEGORIES.map(({ key }) => ({
      user_id: userId,
      category: key,
      enabled: notifSettings[key].enabled,
      quiet_hours_start: qStart,
      quiet_hours_end: qEnd,
    }));

    await supabase
      .from('user_notification_settings')
      .upsert(upserts, { onConflict: 'user_id,category' });

    setNotifLoading(false);
    Alert.alert('Saved', 'Quiet hours updated.');
  }

  async function handleExport() {
    if (!userId) return;
    setExportLoading(true);
    try {
      const { data, error } = await supabase
        .from('behavior_events')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        Alert.alert('Export failed', error.message);
        return;
      }

      const json = JSON.stringify(data ?? [], null, 2);
      await Share.share({
        message: json,
        title: 'FoodOS Behavior History',
      });
    } catch (e: unknown) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExportLoading(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    if (!userId) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        Alert.alert('Deletion failed', error.message);
        setDeleteLoading(false);
        return;
      }

      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (e: unknown) {
      Alert.alert('Deletion failed', e instanceof Error ? e.message : 'Unknown error');
      setDeleteLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <Card style={styles.card}>
        {NOTIFICATION_CATEGORIES.map(({ key, label, description }, i) => (
          <View key={key}>
            <SettingRow
              label={label}
              description={description}
              value={notifSettings[key].enabled}
              onValueChange={(v) => toggleCategory(key, v)}
            />
            {i < NOTIFICATION_CATEGORIES.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>

      {/* Quiet Hours */}
      <SectionHeader title="Quiet Hours" />
      <Card style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
            <Text style={styles.settingDesc}>No notifications during this window</Text>
          </View>
          <Switch
            value={quietEnabled}
            onValueChange={setQuietEnabled}
            trackColor={{ false: Colors.border + '44', true: Colors.primaryLight }}
            thumbColor={quietEnabled ? Colors.primary : Colors.border}
            accessibilityLabel="Enable quiet hours"
            accessibilityRole="switch"
            accessibilityState={{ checked: quietEnabled }}
          />
        </View>
        {quietEnabled && (
          <>
            <View style={styles.divider} />
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Start</Text>
                <TextInput
                  style={styles.timeInput}
                  value={quietStart}
                  onChangeText={setQuietStart}
                  placeholder="22:00"
                  placeholderTextColor={Colors.textSecondary}
                  accessibilityLabel="Quiet hours start time"
                />
              </View>
              <Text style={[styles.timeSep, { marginTop: Spacing.lg }]}>–</Text>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>End</Text>
                <TextInput
                  style={styles.timeInput}
                  value={quietEnd}
                  onChangeText={setQuietEnd}
                  placeholder="08:00"
                  placeholderTextColor={Colors.textSecondary}
                  accessibilityLabel="Quiet hours end time"
                />
              </View>
            </View>
            <Button
              label="Save Quiet Hours"
              onPress={saveQuietHours}
              loading={notifLoading}
              accessibilityLabel="Save quiet hours"
              style={styles.actionBtn}
            />
          </>
        )}
      </Card>

      {/* Schedule */}
      <SectionHeader title="Meal Schedule" />
      <Card style={styles.card}>
        {mealWindows.length === 0 ? (
          <Text style={styles.emptyText}>No meal windows configured.</Text>
        ) : (
          mealWindows.map((w, i) => (
            <View key={w.id}>
              <MealWindowRow
                window={w}
                onEdit={updateMealWindow}
                onSetManual={setManualOverride}
              />
              {i < mealWindows.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
      </Card>

      {/* Data */}
      <SectionHeader title="Data" />
      <Card style={styles.card}>
        <Text style={styles.settingLabel}>Export Behavior History</Text>
        <Text style={styles.settingDesc}>Download your activity data as JSON</Text>
        <Button
          label="Export as JSON"
          variant="secondary"
          onPress={handleExport}
          loading={exportLoading}
          accessibilityLabel="Export behavior history as JSON"
          style={styles.actionBtn}
        />
      </Card>

      {/* Account */}
      <SectionHeader title="Account" />
      <Card style={styles.card}>
        <Text style={styles.settingLabel}>Delete Account</Text>
        <Text style={styles.settingDesc}>
          Permanently removes your account and all data. This cannot be undone.
        </Text>
        <Button
          label="Delete Account"
          variant="ghost"
          onPress={confirmDeleteAccount}
          loading={deleteLoading}
          accessibilityLabel="Delete account"
          style={[styles.actionBtn, styles.deleteBtn]}
        />
      </Card>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.sm },
  screenTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  card: { gap: 0, padding: 0, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border + '44', marginHorizontal: Spacing.md },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 56,
  },
  settingInfo: { flex: 1, marginRight: Spacing.sm },
  settingLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium as any, color: Colors.text },
  settingDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  fieldLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  timeField: { flex: 1 },
  timeSep: { fontSize: FontSize.lg, color: Colors.textSecondary },
  timeInput: {
    borderWidth: 1,
    borderColor: Colors.border + '88',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 44,
  },
  timeInputHalf: { flex: 1 },
  actionBtn: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, marginTop: Spacing.xs },
  deleteBtn: { borderWidth: 1, borderColor: Colors.error },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, padding: Spacing.md },
  errorText: { fontSize: FontSize.xs, color: Colors.error, paddingHorizontal: Spacing.md },
  // Meal window row
  mealWindowRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  mealWindowHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  mealWindowDay: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold as any, color: Colors.text, width: 32 },
  mealWindowTime: { fontSize: FontSize.sm, color: Colors.textSecondary },
  manualBadge: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  editLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium as any, marginLeft: 'auto' },
  editForm: { gap: Spacing.xs, marginTop: Spacing.xs },
  editActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  saveBtn: { flex: 1 },
  bottomPad: { height: Spacing.xxl },
});
