import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Activity,
  Users,
  Settings,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Base height of the tab bar content (icon + label + spacing) excluding safe-area bottom inset
  const TAB_BAR_BASE_HEIGHT = 60;
  const bottomInset = Math.max(insets?.bottom ?? 0, 0);

  // When Android (3-button / gesture nav) or iOS (home indicator) has a bottom inset,
  // expand the tab bar height and apply bottom padding so all tab content sits cleanly above it.
  const tabHeight = TAB_BAR_BASE_HEIGHT + bottomInset;
  const paddingBottom = bottomInset > 0 ? bottomInset : spacing.sm;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          paddingBottom,
          height: tabHeight,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.fontSize.tiny,
          marginTop: spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => (
            <Activity size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
