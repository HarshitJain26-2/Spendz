import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeDatabase, seedDefaultCategories } from '@/database';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { initAlertPolyfill } from '@/utils/alert';

initAlertPolyfill();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore splash screen errors on platforms where it's not supported
});

function NavigationProtection() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const setIntendedDestination = useAuthStore((s) => s.setIntendedDestination);

  useEffect(() => {
    if (!isInitialized) return;

    const segmentList = segments as string[];
    // When at root ('/' or 'index'), index.tsx handles the initial redirection
    if (!segmentList || segmentList.length === 0 || segmentList[0] === 'index') return;

    const inAuthGroup = segmentList[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      const path = `/${segmentList.join('/')}`;
      if (path !== '/index' && path !== '/') {
        setIntendedDestination(path);
      }
      router.replace('/auth/sign-in');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isInitialized, segments, router, setIntendedDestination]);

  return null;
}

export default function RootLayout() {
  const { colors: themeColors, isDark } = useTheme();
  const setIsDbReady = useAppStore((s) => s.setIsDbReady);
  const isDbReady = useAppStore((s) => s.isDbReady);
  const isHydrated = useAppStore((s) => s.isHydrated);
  const setIsHydrated = useAppStore((s) => s.setIsHydrated);
  const isAuthInitialized = useAuthStore((s) => s.isInitialized);

  const [initStatus, setInitStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  const [initError, setInitError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const prepare = useCallback(async () => {
    setInitStatus('initializing');
    setInitError(null);
    try {
      // 1. Initialize database & safe migrations (SQLite on Android, localStorage on Web)
      await initializeDatabase();

      // 2. Idempotently seed any missing default categories (never duplicate)
      seedDefaultCategories();

      // 3. Load persisted app settings & profile (including legacy data fallback)
      useAppStore.getState().loadSettings();

      // 4. Load all data stores
      useAccountStore.getState().loadAccounts();
      useCategoryStore.getState().loadCategories();
      useTransactionStore.getState().loadTransactions();
      useFriendStore.getState().loadFriends();
      useSplitStore.getState().loadSplitExpenses();
      useGroupStore.getState().loadGroups();

      // 5. Initialize auth session (retrieves persistent session)
      await useAuthStore.getState().initAuth();

      // 6. Complete hydration
      setIsHydrated(true);
      setIsDbReady(true);
      setInitStatus('ready');
    } catch (e: any) {
      console.error('Failed to initialize Spendz data layer:', e);
      setInitError(e?.message || 'Unknown initialization error');
      setInitStatus('error');
    }
  }, [setIsDbReady, setIsHydrated]);

  useEffect(() => {
    prepare();
  }, [prepare]);

  useEffect(() => {
    if (fontsLoaded && isDbReady && isHydrated && isAuthInitialized && initStatus === 'ready') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isDbReady, isHydrated, isAuthInitialized, initStatus]);

  const isLoading = !fontsLoaded || !isDbReady || !isHydrated || !isAuthInitialized || initStatus !== 'ready';

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: themeColors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationProtection />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: themeColors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="transaction" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="groups" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="profile" />
      </Stack>


      {/* Error Overlay with Retry */}
      {initStatus === 'error' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.centerContainer,
            { backgroundColor: themeColors.background, zIndex: 999 },
          ]}
        >
          <Text style={[styles.errorTitle, { color: themeColors.expense }]}>
            Spendz
          </Text>
          <Text style={[styles.errorSubtitle, { color: themeColors.textPrimary }]}>
            Something went wrong while loading your data.
          </Text>
          {initError && (
            <Text style={[styles.errorDetails, { color: themeColors.textSecondary }]}>
              {initError}
            </Text>
          )}
          <TouchableOpacity
            onPress={prepare}
            style={[styles.retryButton, { backgroundColor: themeColors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Initializing / Loading Overlay */}
      {isLoading && initStatus !== 'error' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.centerContainer,
            { backgroundColor: themeColors.background, zIndex: 999 },
          ]}
        >
          <Image
            source={require('@/assets/images/spendz-logo.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={[styles.brandTitle, { color: themeColors.textPrimary }]}>
            Spendz
          </Text>
          <Text style={[styles.brandSubtitle, { color: themeColors.textSecondary }]}>
            Checking session & preparing data...
          </Text>
          <ActivityIndicator
            size="small"
            color={themeColors.accent}
            style={styles.spinner}
          />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: spacing.lg,
  },
  brandTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h1,
    marginBottom: spacing.xs,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.body,
    marginBottom: spacing.xl,
  },
  spinner: {
    marginTop: spacing.md,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h2,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorDetails: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
});
