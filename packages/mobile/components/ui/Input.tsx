import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing, AnimationDuration } from '@/constants/theme';

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
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue(Colors.border);
  const labelScale = useSharedValue(1);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: labelScale.value }],
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderColor.value = withTiming(error ? Colors.error : Colors.primary, {
      duration: AnimationDuration.fast,
    });
    labelScale.value = withTiming(0.95, { duration: AnimationDuration.fast });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderColor.value = withTiming(error ? Colors.error : Colors.border, {
      duration: AnimationDuration.fast,
    });
    labelScale.value = withTiming(1, { duration: AnimationDuration.fast });
  };

  React.useEffect(() => {
    if (error) {
      borderColor.value = withTiming(Colors.error, { duration: AnimationDuration.fast });
    } else if (!isFocused) {
      borderColor.value = withTiming(Colors.border, { duration: AnimationDuration.fast });
    }
  }, [error]);

  return (
    <View style={styles.container}>
      <Animated.View style={[{ alignSelf: 'flex-start' }, animatedLabelStyle]}>
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      </Animated.View>
      <Animated.View style={[styles.inputWrapper, animatedBorderStyle]}>
        <TextInput
          style={[styles.input, style]}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={error ?? undefined}
          accessibilityState={{ disabled: rest.editable === false }}
          placeholderTextColor={Colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </Animated.View>
      {error ? (
        <Animated.View
          entering={undefined}
          exiting={undefined}
        >
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  labelError: {
    color: Colors.error,
  },
  inputWrapper: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.error,
    fontWeight: FontWeight.medium as any,
  },
});
