import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  User,
  Wallet,
  Coins,
  Palette,
  FileText,
  Users,
  Receipt,
  Phone,
  Mail,
  Calendar,
  Settings,
  Tag,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useBottomTabInset } from '@/hooks/useBottomTabInset';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useFriendStore } from '@/store/friendStore';
import { useTransactionStore } from '@/store/transactionStore';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function ProfileTabScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottomTabInset = useBottomTabInset(spacing.lg);

  // Stable selectors from Zustand stores
  const userProfile = useAppStore((s) => s.userProfile);
  const themeMode = useAppStore((s) => s.themeMode);
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const friends = useFriendStore((s) => s.friends);
  const transactions = useTransactionStore((s) => s.transactions);

  const displayName = (userProfile.fullName || userProfile.name || '').trim();
  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'dark':
        return 'Dark Mode';
      case 'light':
        return 'Light Mode';
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
      {/* 1. App Top Header (consistent with other tabs) */}
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
              Profile
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/settings' as any)}
          style={[
            styles.iconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
        >
          <Settings size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabInset },
        ]}
      >
        {/* 2. Profile Hero Card */}
        <Card style={styles.heroCard} padding="lg">
          <View style={styles.heroContent}>
            <View style={styles.avatarWrapper}>
              <Avatar
                name={displayName || 'You'}
                avatarUri={userProfile.avatarUri}
                size={84}
              />
            </View>

            <Text
              style={[styles.heroName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {displayName || 'Your Profile'}
            </Text>

            {userProfile.email ? (
              <View style={styles.heroMetaRow}>
                <Mail size={14} color={colors.textTertiary} />
                <Text
                  style={[styles.heroEmail, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {userProfile.email}
                </Text>
              </View>
            ) : (
              <Text style={[styles.heroEmailFallback, { color: colors.textTertiary }]}>
                Add your details
              </Text>
            )}

            {userProfile.phone ? (
              <View style={styles.heroMetaRow}>
                <Phone size={14} color={colors.textTertiary} />
                <Text
                  style={[styles.heroPhone, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {userProfile.phone}
                </Text>
              </View>
            ) : null}

            <View style={styles.heroButtonWrapper}>
              <Button
                title="Edit Profile"
                onPress={() => router.push('/profile/edit' as any)}
                variant="secondary"
                size="md"
                style={styles.heroEditBtn}
              />
            </View>
          </View>
        </Card>

        {/* 3. Real Stats: Your Spendz */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            YOUR SPENDZ
          </Text>
        </View>

        <Card padding="md" style={styles.statsCard}>
          <View style={styles.statsRow}>
            {/* Accounts Stat */}
            <TouchableOpacity
              onPress={() => router.push('/settings/accounts' as any)}
              style={styles.statCol}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Wallet size={16} color={colors.accent} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {accounts.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {accounts.length === 1 ? 'Account' : 'Accounts'}
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            {/* Friends Stat */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/friends' as any)}
              style={styles.statCol}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.transferLight },
                ]}
              >
                <Users size={16} color={colors.transfer} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {friends.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {friends.length === 1 ? 'Friend' : 'Friends'}
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.statDivider, { backgroundColor: colors.border }]}
            />

            {/* Transactions Stat */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/activity' as any)}
              style={styles.statCol}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.incomeLight },
                ]}
              >
                <Receipt size={16} color={colors.income} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {transactions.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {transactions.length === 1 ? 'Transaction' : 'Transactions'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* SECTION 1: Personal */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PERSONAL
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          <TouchableOpacity
            onPress={() => router.push('/profile/edit' as any)}
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
                <User size={18} color={colors.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Edit Profile
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  Full name, email, phone & avatar
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 2: Preferences & Management */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PREFERENCES & MANAGEMENT
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          {/* Default Currency */}
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Coins size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Default Currency
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  {userProfile.currency || '₹'} · Indian Rupee (INR)
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
                <Wallet size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Accounts
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  {defaultAccount ? `${defaultAccount.name} (${defaultAccount.type}) · ${accounts.length} total` : `${accounts.length} active`}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
                <Tag size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Categories
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  {categories.length} total categories
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
                <Palette size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Appearance
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  {getThemeLabel()}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 3: Data & Settings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA & SETTINGS
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
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <FileText size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  Reports & Export
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  Generate financial statements & CSV data
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* All App Settings */}
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
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
                <Settings size={18} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.menuTextGroup}>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                  All App Settings
                </Text>
                <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                  Manage preferences, backup & reset data
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </Card>

        {/* SECTION 4: About */}
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
              <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
                Spendz
              </Text>
              <Text style={[styles.menuSub, { color: colors.textTertiary }]}>
                Version 1.0.0 · Local-First Expense Tracker
              </Text>
              {userProfile.createdAt ? (
                <View style={styles.memberSinceRow}>
                  <Calendar size={12} color={colors.textTertiary} />
                  <Text style={[styles.memberSinceText, { color: colors.textTertiary }]}>
                    Member since {new Date(userProfile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ) : null}
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
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 13,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  heroCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
  },
  heroContent: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.sm,
  },
  avatarWrapper: {
    marginBottom: spacing.md,
  },
  heroName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h2,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  heroEmail: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  heroEmailFallback: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.bodySmall,
    marginTop: 2,
  },
  heroPhone: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  heroButtonWrapper: {
    marginTop: spacing.lg,
    width: '100%',
    maxWidth: 180,
  },
  heroEditBtn: {
    borderRadius: borderRadius.full,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  statsCard: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
  },
  groupedCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextGroup: {
    flex: 1,
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
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  aboutLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  aboutText: {
    flex: 1,
  },
  memberSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  memberSinceText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
  },
});
