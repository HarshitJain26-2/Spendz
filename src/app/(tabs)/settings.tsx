import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Wallet,
  Tag,
  Palette,
  User,
  ChevronRight,
  RotateCcw,
  Check,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useBottomTabInset } from '@/hooks/useBottomTabInset';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { showAlert } from '@/utils/alert';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottomTabInset = useBottomTabInset(spacing.lg);

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

  const handleResetData = () => {
    showAlert(
      'Reset All Data',
      'Are you sure you want to reset all data? This will restore the app to factory settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            useAppStore.getState().setHasOnboarded(false);
            router.replace('/onboarding' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* 1. App Top Header */}
      <View style={styles.header}>
        <View style={styles.logoGroup}>
          <Image
            source={require('@/assets/images/spendz-logo.png')}
            style={styles.logoBadge}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>
              Spendz
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textTertiary }]}>
              Settings
            </Text>
          </View>
        </View>

        <Avatar name={userProfile.name || 'You'} size={36} />
      </View>

      {/* 2. Page Title Row */}
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabInset },
        ]}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard} padding="md">
          <View style={styles.profileRow}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <User size={22} color={colors.accent} strokeWidth={2.2} />
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
                    <Check size={16} color="#000000" strokeWidth={2.4} />
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
                    Tap to edit profile
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>

        {/* Section: PREFERENCES & MANAGEMENT */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PREFERENCES & MANAGEMENT
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          {/* Accounts */}
          <TouchableOpacity
            onPress={() => router.push('/settings/accounts' as any)}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Wallet size={20} color={colors.accent} strokeWidth={2} />
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
                  styles.iconContainer,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Tag size={20} color={colors.accent} strokeWidth={2} />
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
                  styles.iconContainer,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Palette size={20} color={colors.accent} strokeWidth={2} />
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

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Reports & Export */}
          <TouchableOpacity
            onPress={() => router.push('/reports' as any)}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <FileText size={20} color={colors.accent} strokeWidth={2} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.textPrimary }]}
                >
                  Reports & Export
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  Export your spending data
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Section: DATA & STORAGE */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA & BACKUP
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          <TouchableOpacity
            onPress={handleResetData}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.expenseLight },
                ]}
              >
                <RotateCcw size={18} color={colors.expense} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.expense }]}>
                  Reset All Data
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  Clear all local transactions and accounts
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Section: ABOUT */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ABOUT
          </Text>
        </View>

        <Card padding="md" style={styles.groupedCard}>
          <View style={styles.aboutRow}>
            <Image
              source={require('@/assets/images/spendz-logo.png')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <View style={styles.aboutText}>
              <Text
                style={[styles.menuTitle, { color: colors.textPrimary }]}
              >
                Spendz
              </Text>
              <Text
                style={[styles.menuSub, { color: colors.textTertiary }]}
              >
                Version 1.0.0 · Local-First Expense Tracker
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
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
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  titleRow: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  profileCard: {
    marginBottom: spacing.xs,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    marginBottom: 2,
  },
  profileSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 15,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  groupedCard: {
    borderRadius: borderRadius.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  menuSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aboutLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  aboutText: {
    flex: 1,
  },
});
