import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { ThemeMode } from '@/types';

export default function AppearanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  const options: Array<{
    mode: ThemeMode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      mode: 'system',
      label: 'System Default',
      description: 'Match your device light/dark appearance settings automatically',
      icon: <Smartphone size={22} color={colors.accent} />,
    },
    {
      mode: 'dark',
      label: 'Dark Mode',
      description: 'Sleek, battery-friendly dark theme optimized for OLED screens',
      icon: <Moon size={22} color={colors.accent} />,
    },
    {
      mode: 'light',
      label: 'Light Mode',
      description: 'Bright and clean aesthetic with warm off-white tones',
      icon: <Sun size={22} color={colors.accent} />,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Appearance
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.caption, { color: colors.textSecondary }]}>
          Choose how you want Spendz to look.
        </Text>

        <View style={styles.list}>
          {options.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => setThemeMode(opt.mode)}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected
                      ? colors.accent + '12'
                      : colors.surfaceElevated,
                    borderColor: isSelected
                      ? colors.accent
                      : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isSelected
                        ? colors.accent + '20'
                        : colors.surface,
                    },
                  ]}
                >
                  {opt.icon}
                </View>

                <View style={styles.textWrap}>
                  <Text
                    style={[
                      styles.optLabel,
                      {
                        color: isSelected
                          ? colors.accent
                          : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[styles.optDesc, { color: colors.textTertiary }]}
                  >
                    {opt.description}
                  </Text>
                </View>

                {isSelected && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  list: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  optLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  optDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    lineHeight: 18,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
