import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface LoadingSpinnerProps {
  /** Message shown below the spinner and announced to screen readers */
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export function LoadingSpinner({
  message = 'Loading',
  size = 'large',
  color = Colors.primary,
}: LoadingSpinnerProps) {
  return (
    <View
      style={styles.container}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      accessible
    >
      <ActivityIndicator size={size} color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
