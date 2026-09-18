import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Activity,
  Users,
  Settings,
  Plus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

export type CustomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  const getTabIcon = (routeName: string, isFocused: boolean, color: string) => {
    switch (routeName) {
      case 'index':
        return <Home size={22} color={color} strokeWidth={isFocused ? 2.4 : 2} />;
      case 'activity':
        return <Activity size={22} color={color} strokeWidth={isFocused ? 2.4 : 2} />;
      case 'friends':
        return <Users size={22} color={color} strokeWidth={isFocused ? 2.4 : 2} />;
      case 'settings':
        return <Settings size={22} color={color} strokeWidth={isFocused ? 2.4 : 2} />;
      default:
        return null;
    }
  };

  const getTabLabel = (routeName: string) => {
    switch (routeName) {
      case 'index':
        return 'Home';
      case 'activity':
        return 'Activity';
      case 'friends':
        return 'Friends';
      case 'settings':
        return 'Settings';
      default:
        return '';
    }
  };

  // Find index routes
  const homeRoute = state.routes.find((r: { name: string }) => r.name === 'index');
  const activityRoute = state.routes.find((r: { name: string }) => r.name === 'activity');
  const friendsRoute = state.routes.find((r: { name: string }) => r.name === 'friends');
  const settingsRoute = state.routes.find((r: { name: string }) => r.name === 'settings');

  const renderTabItem = (route?: typeof state.routes[0]) => {
    if (!route) return null;
    const isFocused = state.routes[state.index].key === route.key;
    const label = getTabLabel(route.name);
    // In the reference, active tab uses purple or accent
    const activeColor = isDark ? colors.accent : '#5046E5';
    const color = isFocused ? activeColor : colors.textTertiary;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.tabItem}
      >
        {getTabIcon(route.name, isFocused, color)}
        <Text
          style={[
            styles.tabLabel,
            {
              color,
              fontFamily: isFocused
                ? typography.fontFamily.semiBold
                : typography.fontFamily.medium,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.barContainer,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {/* 1. Home */}
      {renderTabItem(homeRoute)}

      {/* 2. Activity */}
      {renderTabItem(activityRoute)}

      {/* 3. Center Prominent Mint Plus Button */}
      <View style={styles.centerButtonWrap}>
        <TouchableOpacity
          onPress={() => router.push('/add/expense')}
          activeOpacity={0.8}
          style={[
            styles.centerPlusButton,
            { backgroundColor: colors.accent },
            shadows.md,
          ]}
        >
          <Plus size={26} color="#000000" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* 4. Friends */}
      {renderTabItem(friendsRoute)}

      {/* 5. Settings */}
      {renderTabItem(settingsRoute)}
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  centerButtonWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
