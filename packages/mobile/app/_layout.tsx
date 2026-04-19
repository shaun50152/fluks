import { LogBox, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
LogBox.ignoreLogs([/expo-notifications: Android Push notifications/]);

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const { session, isLoading, restoreSession, userId } = useAuthStore();
  const { profile, isLoading: profileLoading, fetchProfile } = useProfileStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (isLoading) return;
    if (session && profileLoading) return; // Still fetching profile

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    console.log('Redirect check:', { session: !!session, profile: !!profile, onboarded: profile?.onboarded, inAuthGroup, inOnboardingGroup, segments });

    if (!session && !inAuthGroup) {
      console.log('Redirecting to sign-in');
      router.replace('/(auth)/sign-in');
    } else if (session && profile && profile.onboarded === false && !inOnboardingGroup) {
      console.log('Redirecting to onboarding');
      router.replace('/(onboarding)/persona');
    } else if (session && profile && profile.onboarded !== false && inAuthGroup) {
      console.log('Redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [session, isLoading, profile, profileLoading, segments]);

  if (isLoading || (session && profileLoading && profile === null)) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 20, color: '#000' }}>Loading Auth...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="create" options={{ headerShown: false }} />
        <Stack.Screen name="pantry" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
