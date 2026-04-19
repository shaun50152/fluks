import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Card } from './Card';
import { Button } from './Button';

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorCard({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try again',
}: ErrorCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.emoji} accessibilityElementsHidden>
        😕
      </Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.buttonWrapper}>
          <Button
            label={retryLabel}
            variant="secondary"
            onPress={onRetry}
            accessibilityLabel={retryLabel}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonWrapper: {
    marginTop: Spacing.sm,
  },
});
