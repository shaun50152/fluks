import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from '@/stores/auth.store';
import { useProfileStore } from '@/stores/profile.store';
import { BrandColors } from '@/constants/theme';

export default function RootLayout() {
  const { session, isLoading, restoreSession } = useAuthStore();
  const { profile, isLoading: profileLoading, fetchProfile } = useProfileStore();

  useEffect(() => {
    restoreSession().then(() => {
      if (useAuthStore.getState().userId) {
        fetchProfile();
      }
    });
  }, []);

  if (isLoading || (session && profileLoading && profile === null)) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profile && profile.onboarded === false) {
    return <Redirect href="/(onboarding)/persona" />;
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
    backgroundColor: BrandColors.background,
  },
});
