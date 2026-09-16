import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDatabase } from '@/database';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore splash screen errors on platforms where it's not supported
});

export default function RootLayout() {
  const { colors: themeColors, isDark } = useTheme();
  const setIsDbReady = useAppStore((s) => s.setIsDbReady);
  const isDbReady = useAppStore((s) => s.isDbReady);

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
      // Initialize database (SQLite on Android, localStorage on Web)
      await initializeDatabase();

      // Load all data into stores
      useAccountStore.getState().loadAccounts();
      useCategoryStore.getState().loadCategories();
      useTransactionStore.getState().loadTransactions();
      useFriendStore.getState().loadFriends();
      useSplitStore.getState().loadSplitExpenses();

      setIsDbReady(true);
      setInitStatus('ready');
    } catch (e: any) {
      console.error('Failed to initialize Spendz data layer:', e);
      setInitError(e?.message || 'Unknown initialization error');
      setInitStatus('error');
    }
  }, [setIsDbReady]);

  useEffect(() => {
    prepare();
  }, [prepare]);

  useEffect(() => {
    if (fontsLoaded && isDbReady && initStatus === 'ready') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isDbReady, initStatus]);

  // Error State UI with Retry
  if (initStatus === 'error') {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: themeColors.background },
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
    );
  }

  // Initializing / Loading State UI
  if (!fontsLoaded || !isDbReady || initStatus !== 'ready') {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: themeColors.background },
        ]}
      >
        <Text style={[styles.brandTitle, { color: themeColors.accent }]}>
          Spendz
        </Text>
        <Text style={[styles.brandSubtitle, { color: themeColors.textSecondary }]}>
          Preparing your data...
        </Text>
        <ActivityIndicator
          size="large"
          color={themeColors.accent}
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: themeColors.background },
          animation: 'slide_from_right',
        }}
      >
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
        <Stack.Screen name="insights" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
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
