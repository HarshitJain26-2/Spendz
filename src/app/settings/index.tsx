import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  ArrowLeft,
  Wallet,
  Tag,
  Palette,
  ChevronRight,
  RotateCcw,
  FileText,
  User,
  ShieldCheck,
  LogOut,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import { showAlert } from '@/utils/alert';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const userProfile = useAppStore((s) => s.userProfile);
  const themeMode = useAppStore((s) => s.themeMode);
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const authUser = useAuthStore((s) => s.user);

  const displayName = (userProfile.fullName || userProfile.name || '').trim();

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

  const handleSignOut = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await useAuthStore.getState().signOut();
            router.replace('/auth/sign-in');
          },
        },
      ]
    );
  };

  const handleSecurity = () => {
    const emailToReset = userProfile.email || authUser?.email;
    showAlert(
      'Security & Authentication',
      `Signed in as:\n${emailToReset || 'Active User'}\nUser ID: ${authUser?.id || userProfile.id || 'N/A'}\n\nWould you like to send a password reset link to your email?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset Link',
          onPress: async () => {
            if (!emailToReset) {
              showAlert('Error', 'No email address found for this account.');
              return;
            }
            try {
              const redirectTo =
                Platform.OS === 'web' && typeof window !== 'undefined'
                  ? `${window.location.origin}/auth/sign-in`
                  : Linking.createURL('/auth/sign-in');
              const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
                redirectTo,
              });
              if (error) {
                showAlert('Reset Failed', error.message);
              } else {
                showAlert(
                  'Reset Email Sent',
                  'Password reset instructions have been sent to your email.'
                );
              }
            } catch (e: any) {
              showAlert('Reset Failed', e?.message || 'Unable to send reset email.');
            }
          },
        },
      ]
    );
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
      {/* 1. Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={[
            styles.backButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Settings
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.7}
        >
          <Avatar
            name={displayName || 'You'}
            avatarUri={userProfile.avatarUri}
            size={36}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <Card
          style={styles.profileCard}
          padding="md"
          onPress={() => router.push('/profile' as any)}
          activeOpacity={0.7}
        >
          <View style={styles.profileRow}>
            <Avatar
              name={displayName || 'You'}
              avatarUri={userProfile.avatarUri}
              size={48}
            />

            <View style={styles.profileInfo}>
              <Text
                style={[styles.profileName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {displayName || 'Your Profile'}
              </Text>
              <Text
                style={[styles.profileSub, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {userProfile.email || (userProfile.phone ? userProfile.phone : 'Tap to view & edit profile')}
              </Text>
            </View>

            <ChevronRight size={20} color={colors.textTertiary} />
          </View>
        </Card>

        {/* Section: ACCOUNT */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACCOUNT
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          {/* Profile */}
          <TouchableOpacity
            onPress={() => router.push('/profile' as any)}
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
                <User size={20} color={colors.accent} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Profile
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  {userProfile.email || 'Manage personal details'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Security */}
          <TouchableOpacity
            onPress={handleSecurity}
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
                <ShieldCheck size={20} color={colors.accent} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Security
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  Password reset & authenticated session
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                ]}
              >
                <LogOut size={20} color={colors.expense} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.expense }]}>
                  Sign Out
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  Sign out of your Spendz account
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
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
        </Card>

        {/* Section: DATA & SYSTEM */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA & SYSTEM
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
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
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <FileText size={20} color={colors.accent} strokeWidth={2} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.textPrimary }]}
                >
                  Financial Reports
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  Generate statements & export CSV
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Reset All Data */}
          <TouchableOpacity
            onPress={handleResetData}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                ]}
              >
                <RotateCcw size={20} color={colors.expense} strokeWidth={2} />
              </View>
              <View>
                <Text
                  style={[styles.menuTitle, { color: colors.expense }]}
                >
                  Reset All Data
                </Text>
                <Text
                  style={[styles.menuSub, { color: colors.textTertiary }]}
                >
                  Clear all local transactions and cache
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* Section: APP INFO */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APP INFO
          </Text>
        </View>

        <Card padding="md" style={styles.groupedCard}>
          <View style={styles.aboutRow}>
            <Image
              source={require('@/assets/images/spendz-logo.png')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <View style={styles.aboutInfo}>
              <Text
                style={[styles.menuTitle, { color: colors.textPrimary }]}
              >
                Spendz
              </Text>
              <Text
                style={[styles.menuSub, { color: colors.textTertiary }]}
              >
                Version 1.0.0 · Local-First Architecture
              </Text>
              <Text
                style={[styles.aboutHint, { color: colors.textTertiary }]}
              >
                Your data is stored privately on this device.
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
  backButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing['4xl'],
  },
  profileCard: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  profileSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.tiny,
    letterSpacing: 1.2,
  },
  groupedCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  menuSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  divider: {
    height: 1,
    marginLeft: spacing.lg + 38 + spacing.md,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: spacing.md,
  },
  aboutInfo: {
    flex: 1,
  },
  aboutHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },
});
