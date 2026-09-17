import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  HandCoins,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useTransactionStore } from '@/store/transactionStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeDate } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const friends = useFriendStore((s) => s.friends);
  const friend = useMemo(
    () => friends.find((f) => f.id === id),
    [friends, id]
  );
  const deleteFriend = useFriendStore((s) => s.deleteFriend);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const getFriendBalance = useSplitStore((s) => s.getFriendBalance);
  const transactions = useTransactionStore((s) => s.transactions);

  const balance = useMemo(
    () => (friend ? getFriendBalance(friend.id) : 0),
    [friend, splitExpenses, getFriendBalance]
  );
  const splits = useMemo(
    () =>
      friend
        ? splitExpenses.filter((split) =>
            split.participants?.some((p) => p.friendId === friend.id)
          )
        : [],
    [friend, splitExpenses]
  );

  if (!friend) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.textSecondary }}>Friend not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Friend',
      `Are you sure you want to delete ${friend.name}? This will remove them from your friends list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteFriend(friend.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Friend Details
        </Text>
        <TouchableOpacity onPress={handleDelete} activeOpacity={0.7}>
          <Trash2 size={20} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Avatar name={friend.name} size={64} />
          <Text style={[styles.friendName, { color: colors.textPrimary }]}>
            {friend.name}
          </Text>
          {Boolean(friend.phone) && (
            <Text style={[styles.friendPhone, { color: colors.textTertiary }]}>
              {friend.phone}
            </Text>
          )}

          {/* Balance Status */}
          <View style={styles.balanceWrap}>
            <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
              {balance > 0
                ? `${friend.name} owes you`
                : balance < 0
                  ? `You owe ${friend.name}`
                  : 'All settled up'}
            </Text>
            <Text
              style={[
                styles.balanceAmount,
                {
                  color:
                    balance > 0
                      ? colors.income
                      : balance < 0
                        ? colors.expense
                        : colors.textSecondary,
                },
              ]}
            >
              {balance !== 0 ? formatCurrency(Math.abs(balance)) : '₹0'}
            </Text>
          </View>

          {balance > 0 && (
            <Button
              title="Settle Up"
              icon={<HandCoins size={18} color="#FFFFFF" />}
              onPress={() =>
                router.push({
                  pathname: '/friends/settle' as any,
                  params: { friendId: friend.id },
                })
              }
              size="md"
              fullWidth
            />
          )}
        </View>

        {/* Split History Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Shared Expenses ({splits.length})
          </Text>
        </View>

        {splits.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              No shared expenses with {friend.name} yet.
            </Text>
          </View>
        ) : (
          splits.map((split) => {
            const transaction = transactions.find(
              (t) => t.id === split.transactionId
            );
            const participant = split.participants?.find(
              (p) => p.friendId === friend.id
            );

            return (
              <TouchableOpacity
                key={split.id}
                onPress={() => {
                  if (transaction) {
                    router.push(`/transaction/${transaction.id}` as any);
                  }
                }}
                activeOpacity={0.7}
                style={[
                  styles.splitItem,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.splitItemLeft}>
                  <Text
                    style={[styles.splitItemTitle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {transaction?.note || 'Shared Expense'}
                  </Text>
                  <Text
                    style={[
                      styles.splitItemDate,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {transaction ? formatRelativeDate(transaction.date) : ''}
                  </Text>
                </View>

                <View style={styles.splitItemRight}>
                  <Text
                    style={[
                      styles.splitItemAmount,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {participant ? formatCurrency(participant.amount) : '₹0'}
                  </Text>
                  {participant?.isPaid ? (
                    <View style={styles.badgeRow}>
                      <CheckCircle2 size={12} color={colors.income} />
                      <Text style={{ color: colors.income, fontSize: 12 }}>
                        Settled
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgeRow}>
                      <Clock size={12} color={colors.expense} />
                      <Text style={{ color: colors.expense, fontSize: 12 }}>
                        Unsettled
                      </Text>
                    </View>
                  )}
                </View>

                <ChevronRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
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
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  friendName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
    marginTop: spacing.xs,
  },
  friendPhone: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  balanceWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: 4,
  },
  balanceCaption: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.hero,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
  },
  splitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  splitItemLeft: {
    flex: 1,
  },
  splitItemTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  splitItemDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  splitItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  splitItemAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
