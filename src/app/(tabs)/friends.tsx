import React, { useMemo } from 'react';
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
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useBottomTabInset } from '@/hooks/useBottomTabInset';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useAppStore } from '@/store/appStore';
import { BalanceSummary } from '@/components/friends/BalanceSummary';
import { FriendCard } from '@/components/friends/FriendCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function FriendsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottomTabInset = useBottomTabInset(spacing.lg);
  const userProfile = useAppStore((s) => s.userProfile);

  const friends = useFriendStore((s) => s.friends);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const getFriendBalance = useSplitStore((s) => s.getFriendBalance);

  // Compute friend balances and total summary
  const { friendBalances, totalOwed, totalOwe } = useMemo(() => {
    let owed = 0;
    let owe = 0;
    const balances: Array<{ friendId: string; balance: number }> = [];

    for (const friend of friends) {
      const balance = getFriendBalance(friend.id);
      balances.push({ friendId: friend.id, balance });
      if (balance > 0) {
        owed += balance;
      } else if (balance < 0) {
        owe += Math.abs(balance);
      }
    }

    return {
      friendBalances: balances,
      totalOwed: owed,
      totalOwe: owe,
    };
  }, [friends, splitExpenses, getFriendBalance]);

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
              Friends
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/friends/add' as any)}
            activeOpacity={0.7}
            style={[
              styles.iconButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Plus size={18} color={colors.textPrimary} strokeWidth={2.4} />
          </TouchableOpacity>
          <Avatar name={userProfile.name || 'You'} size={36} />
        </View>
      </View>

      {/* 2. Page Title Row */}
      <View style={styles.titleRow}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Friends
          </Text>
          <View
            style={[
              styles.countPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomTabInset },
        ]}
      >
        {/* Balance Summary Card */}
        <BalanceSummary youAreOwed={totalOwed} youOwe={totalOwe} />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ALL FRIENDS
          </Text>
        </View>

        {/* Friend List */}
        {friends.length === 0 ? (
          <EmptyState
            title="No friends added yet"
            description="Add your friends to split restaurant bills, rent, group trips, and keep track of who owes who."
            actionLabel="Add First Friend"
            onAction={() => router.push('/friends/add' as any)}
          />
        ) : (
          friends.map((friend) => {
            const fb = friendBalances.find((b) => b.friendId === friend.id);
            const bal = fb ? fb.balance : 0;
            return (
              <FriendCard
                key={friend.id}
                friend={friend}
                balance={bal}
                onPress={() => router.push(`/friends/${friend.id}` as any)}
              />
            );
          })
        )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
