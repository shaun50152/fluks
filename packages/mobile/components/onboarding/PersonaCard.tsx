import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadow, AnimationDuration } from '@/constants/theme';
import type { Persona } from '@/types/domain';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PersonaCardProps {
  persona: Persona;
  emoji: string;
  title: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function PersonaCard({
  persona,
  emoji,
  title,
  description,
  isSelected,
  onSelect,
}: PersonaCardProps) {
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(isSelected ? 2 : 1.5);
  const borderColor = useSharedValue(isSelected ? Colors.primary : Colors.border);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: borderWidth.value,
    borderColor: borderColor.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  React.useEffect(() => {
    borderWidth.value = withTiming(isSelected ? 2 : 1.5, { duration: AnimationDuration.fast });
    borderColor.value = withTiming(
      isSelected ? Colors.primary : Colors.border,
      { duration: AnimationDuration.fast }
    );
  }, [isSelected]);

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Select ${title} persona`}
      accessibilityState={{ selected: isSelected }}
      style={[styles.card, animatedStyle, isSelected && styles.cardSelected]}
    >
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {isSelected && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
    minHeight: 180,
    ...Shadow.md,
  },
  cardSelected: {
    backgroundColor: Colors.background,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  checkmark: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold as any,
  },
});
