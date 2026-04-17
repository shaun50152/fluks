import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Input } from '@/components/ui/Input';
import { BrandColors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { validateEmail, validatePassword, ValidationError } from '@/lib/validator';
import { useAuthStore } from '@/stores/auth.store';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { signUp, isLoading, error } = useAuthStore();

  async function handleSubmit() {
    setEmailError(null);
    setPasswordError(null);

    let valid = true;

    try {
      validateEmail(email);
    } catch (e) {
      if (e instanceof ValidationError) setEmailError(e.message);
      valid = false;
    }

    try {
      validatePassword(password);
    } catch (e) {
      if (e instanceof ValidationError) setPasswordError(e.message);
      valid = false;
    }

    if (!valid) return;

    await signUp(email, password);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up for your FoodOS account</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            accessibilityLabel="Email address"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            error={emailError ?? undefined}
          />
          <Input
            label="Password"
            accessibilityLabel="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={passwordError ?? undefined}
          />

          {error ? (
            <ErrorCard
              title="Sign up failed"
              message={friendlyError(error)}
            />
          ) : null}

          <Button
            label="Create account"
            accessibilityLabel="Create account"
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.submitButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Map raw Supabase/network error messages to user-friendly copy. */
function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many sign-up attempts. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: BrandColors.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: BrandColors.textSecondary,
  },
  form: {
    gap: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.sm,
    color: BrandColors.textSecondary,
  },
  link: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    color: BrandColors.primary,
  },
});
