import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { MotiView } from 'moti';
import { Button } from '@/components/ui/Button';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { Input } from '@/components/ui/Input';
import {
  Colors,
  FontSize,
  FontWeight,
  Spacing,
  BorderRadius,
  AnimationDuration,
} from '@/constants/theme';
import { validateEmail, validatePassword, ValidationError } from '@/lib/validator';
import { useAuthStore } from '@/stores/auth.store';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { signIn, isLoading, error } = useAuthStore();

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

    await signIn(email, password);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: AnimationDuration.slow }}
          style={styles.hero}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>🍽️</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Your intelligent food companion
          </Text>
        </MotiView>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'timing',
            duration: AnimationDuration.slow,
            delay: 100,
          }}
          style={styles.form}
        >
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
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <ErrorCard title="Sign in failed" message={friendlyError(error)} />
            </MotiView>
          ) : null}

          <Button
            label="Sign in"
            accessibilityLabel="Sign in"
            onPress={handleSubmit}
            loading={isLoading}
            size="lg"
            style={styles.submitButton}
          />
        </MotiView>

        {/* Footer */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            type: 'timing',
            duration: AnimationDuration.slow,
            delay: 200,
          }}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" style={styles.link}>
            <Text style={styles.linkText}>Sign up</Text>
          </Link>
        </MotiView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'The email or password you entered is incorrect. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Too many sign-in attempts. Please wait a moment and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.lg,
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
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  link: {
    // Link wrapper
  },
  linkText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: Colors.primary,
  },
});
