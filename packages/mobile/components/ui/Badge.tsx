import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: Colors.primary + '22', text: Colors.primary },
  success: { bg: Colors.success + '22', text: Colors.success },
  warning: { bg: Colors.warning + '22', text: Colors.warning },
  error: { bg: Colors.error + '22', text: Colors.error },
  muted: { bg: Colors.border + '22', text: Colors.textSecondary },
};

export function Badge({ label, variant = 'default', style, ...rest }: BadgeProps) {
  const colors = variantColors[variant];

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.bg }, style]}
      accessibilityRole="text"
      {...rest}
    >
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    letterSpacing: 0.3,
  },
});
