import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadow } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({ children, style, elevated = false, shadow = 'sm' }: CardProps) {
  const shadowStyle = Shadow[shadow];
  
  return (
    <View style={[styles.card, shadowStyle, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
  },
});
