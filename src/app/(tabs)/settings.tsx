import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wallet,
  Tag,
  Palette,
  User,
  ChevronRight,
  Info,
  RotateCcw,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const userProfile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const themeMode = useAppStore((s) => s.themeMode);
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  const [isEditingName, setIsEditingName] = useState(false);
  const [userName, setUserName] = useState(userProfile.name || '');

  const handleSaveName = () => {
    setUserProfile({ name: userName.trim() });
    setIsEditingName(false);
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'dark':
        return 'Dark';
      case 'light':
        return 'Light';
      case 'system':
      default:
        return 'System Default';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.profileIconWrap,
                { backgroundColor: colors.accent + '20' },
              ]}
            >
              <User size={24} color={colors.accent} />
            </View>

            <View style={styles.profileInfo}>
              {isEditingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    value={userName}
                    onChangeText={setUserName}
                    placeholder="Your Name"
                    placeholderTextColor={colors.textTertiary}
                    style={[
                      styles.nameInput,
                      { color: colors.textPrimary, borderColor: colors.accent },
                    ]}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleSaveName}
                    style={[
                      styles.saveBtn,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setUserName(userProfile.name || '');
                    setIsEditingName(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.profileName, { color: colors.textPrimary }]}
                  >
                    {userProfile.name || 'Set your name'}
                  </Text>
                  <Text
                    style={[
                      styles.profileSub,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Tap to edit profile name
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Preferences / Management Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Preferences & Management
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Accounts */}
          <TouchableOpacity
            onPress={() => router.push('/settings/accounts' as any)}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: colors.accent + '15' },
                ]}
              >
                <Wallet size={18} color={colors.accent} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.textPrimary }]}
                >
                  Accounts
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  {accounts.length} active{' '}
                  {accounts.length === 1 ? 'account' : 'accounts'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Categories */}
          <TouchableOpacity
            onPress={() => router.push('/settings/categories' as any)}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: colors.transfer + '15' },
                ]}
              >
                <Tag size={18} color={colors.transfer} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.textPrimary }]}
                >
                  Categories
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  {categories.length} total categories
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Appearance */}
          <TouchableOpacity
            onPress={() => router.push('/settings/appearance' as any)}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: colors.income + '15' },
                ]}
              >
                <Palette size={18} color={colors.income} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.textPrimary }]}
                >
                  Appearance
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  {getThemeLabel()}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* App Info Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            About
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.infoRow}>
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: colors.textTertiary + '15' },
                ]}
              >
                <Info size={18} color={colors.textSecondary} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.textPrimary }]}
                >
                  Spendz
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  Version 1.0.0 • Offline-first SQLite
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h2,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  profileIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h4,
    marginBottom: 2,
  },
  profileSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: typography.fontSize.body,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: -spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  menuSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
});
