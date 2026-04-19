/**
 * In-app notification banner — slides in from top, auto-dismisses after 4s.
 * Requirements: 12.7
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize, FontWeight, Shadow } from '@/constants/theme';

interface InAppBannerProps {
  title: string;
  body: string;
  onPress?: () => void;
  onDismiss?: () => void;
}

export function InAppBanner({ title, body, onPress, onDismiss }: InAppBannerProps) {
  const translateY = useRef(new Animated.Value(-120)).current;

  function dismiss() {
    Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true })
      .start(() => onDismiss?.());
  }

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.content} onPress={() => { onPress?.(); dismiss(); }} activeOpacity={0.9}
        accessibilityRole="button" accessibilityLabel={`Notification: ${title}`}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.body} numberOfLines={2}>{body}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    ...Shadow.lg,
  },
  content: { padding: Spacing.md, borderRadius: BorderRadius.lg },
  title: { fontSize: FontSize.md, fontWeight: FontWeight.semibold as any, color: Colors.text, marginBottom: Spacing.xs },
  body: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
