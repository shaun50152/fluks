import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BrandColors, BorderRadius, Shadows, Spacing } from '@/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** Shadow intensity — defaults to 'md' */
  shadow?: keyof typeof Shadows;
}

export function Card({ children, shadow = 'md', style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, Shadows[shadow], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'visible',
  },
});
