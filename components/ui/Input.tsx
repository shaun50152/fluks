import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface InputProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  label: string;
  accessibilityLabel: string;
  error?: string;
}

export function Input({
  label,
  accessibilityLabel,
  error,
  style,
  ...rest
}: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : styles.inputDefault, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={error ?? undefined}
        accessibilityState={{ disabled: rest.editable === false }}
        placeholderTextColor={BrandColors.muted}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    color: BrandColors.text,
  },
  input: {
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: BrandColors.text,
    backgroundColor: BrandColors.surface,
  },
  inputDefault: {
    borderColor: BrandColors.muted,
  },
  inputError: {
    borderColor: BrandColors.error,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: BrandColors.error,
    fontWeight: FontWeight.medium as any,
  },
});
