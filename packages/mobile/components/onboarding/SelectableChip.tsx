import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, AnimationDuration } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface SelectableChipProps {
  label: string;
  emoji?: string;
  isSelected: boolean;
  onToggle: () => void;
}

export function SelectableChip({ label, emoji, isSelected, onToggle }: SelectableChipProps) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(isSelected ? Colors.primary : Colors.surface);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  React.useEffect(() => {
    backgroundColor.value = withTiming(
      isSelected ? Colors.primary : Colors.surface,
      { duration: AnimationDuration.fast }
    );
  }, [isSelected]);

  return (
    <AnimatedPressable
      onPress={onToggle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}
      style={[styles.chip, animatedStyle]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.label, isSelected && styles.labelSelected]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  emoji: {
    fontSize: FontSize.md,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.text,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
