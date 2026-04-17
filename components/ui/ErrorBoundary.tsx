import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandColors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Render error caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.errorMessage ?? 'An unexpected error occurred. Please try again.'}
          </Text>
          <Pressable
            style={styles.button}
            onPress={this.handleRetry}
            accessibilityLabel="Try again"
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: BrandColors.background,
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: BrandColors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: BrandColors.textInverse,
  },
});
