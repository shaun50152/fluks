import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends Omit<TouchableOpacityProps, 'accessibilityLabel'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  accessibilityLabel: string;
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  accessibilityLabel,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.75}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? BrandColors.textInverse : BrandColors.primary}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: BrandColors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  primaryLabel: {
    color: BrandColors.textInverse,
  },
  secondaryLabel: {
    color: BrandColors.primary,
  },
  ghostLabel: {
    color: BrandColors.primary,
  },
});
