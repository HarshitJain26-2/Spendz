import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';
import { Card } from '@/components/ui/Card';
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
    icon: (color: string) => React.ReactNode;
  }> = [
    {
      mode: 'light',
      label: 'Light Mode',
      description: 'Warm off-white background with pure white cards (Default)',
      icon: (c) => <Sun size={20} color={c} strokeWidth={2} />,
    },
    {
      mode: 'dark',
      label: 'Dark Mode',
      description: 'Sleek, high-contrast dark palette optimized for night',
      icon: (c) => <Moon size={20} color={c} strokeWidth={2} />,
    },
    {
      mode: 'system',
      label: 'System Default',
      description: 'Automatically match device operating system settings',
      icon: (c) => <Smartphone size={20} color={c} strokeWidth={2} />,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Appearance
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            THEME SELECTION
          </Text>
        </View>

        <Card padding="none" style={styles.card}>
          {options.map((opt, index) => {
            const isSelected = themeMode === opt.mode;
            return (
              <View key={opt.mode}>
                <TouchableOpacity
                  onPress={() => setThemeMode(opt.mode)}
                  style={styles.optionRow}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor: isSelected
                          ? colors.accentLight
                          : colors.surfaceElevated,
                      },
                    ]}
                  >
                    {opt.icon(isSelected ? colors.accent : colors.textSecondary)}
                  </View>

                  <View style={styles.textWrap}>
                    <Text
                      style={[
                        styles.optLabel,
                        { color: colors.textPrimary },
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
                      <Check size={14} color="#000000" strokeWidth={2.6} />
                    </View>
                  )}
                </TouchableOpacity>

                {index < options.length - 1 && (
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                )}
              </View>
            );
          })}
        </Card>
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: borderRadius.xl,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  optLabel: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  optDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
});
