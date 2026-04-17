import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: BrandColors.primaryLight + '22', text: BrandColors.primaryDark },
  success: { bg: BrandColors.success + '22', text: BrandColors.success },
  warning: { bg: BrandColors.warning + '22', text: BrandColors.secondary },
  error: { bg: BrandColors.error + '22', text: BrandColors.error },
  muted: { bg: BrandColors.muted + '22', text: BrandColors.textSecondary },
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
