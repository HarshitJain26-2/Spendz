import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDatabase } from '@/database';
import { seedDefaultCategories } from '@/database/seed';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useTheme } from '@/hooks/useTheme';
import { colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors: themeColors, isDark } = useTheme();
  const setIsDbReady = useAppStore((s) => s.setIsDbReady);
  const isDbReady = useAppStore((s) => s.isDbReady);
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const prepare = async () => {
      try {
        // Initialize database
        await initializeDatabase();
        seedDefaultCategories();

        // Load all data into stores
        useAccountStore.getState().loadAccounts();
        useCategoryStore.getState().loadCategories();
        useTransactionStore.getState().loadTransactions();
        useFriendStore.getState().loadFriends();
        useSplitStore.getState().loadSplitExpenses();

        setIsDbReady(true);
      } catch (e) {
        console.error('Failed to initialize:', e);
      }
    };

    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isDbReady) {
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isDbReady]);

  if (!appReady) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: themeColors.background },
        ]}
      >
        <ActivityIndicator size="large" color={themeColors.accent} />
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
