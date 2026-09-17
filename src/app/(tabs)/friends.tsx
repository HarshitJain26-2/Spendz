import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { UserPlus, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { BalanceSummary } from '@/components/friends/BalanceSummary';
import { FriendCard } from '@/components/friends/FriendCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function FriendsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Friends & Splits
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/friends/add' as any)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add Friend</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Summary Card */}
        <BalanceSummary youAreOwed={totalOwed} youOwe={totalOwe} />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            All Friends ({friends.length})
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.small,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
