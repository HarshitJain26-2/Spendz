import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  HandCoins,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useTransactionStore } from '@/store/transactionStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeDate } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

export default function FriendDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const friends = useFriendStore((s) => s.friends);
  const friend = useMemo(
    () => friends.find((f) => f.id === id),
    [friends, id]
  );
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const getFriendBalance = useSplitStore((s) => s.getFriendBalance);
  const transactions = useTransactionStore((s) => s.transactions);

  const balance = useMemo(
    () => (friend ? getFriendBalance(friend.id) : 0),
    [friend, splitExpenses, getFriendBalance]
  );

  const splits = useMemo(() => {
    if (!friend) return [];
    return splitExpenses
      .filter(
        (split) =>
          (split.paidByFriendId === friend.id ||
            split.participants?.some((p) => p.friendId === friend.id)) &&
          transactions.some((t) => t.id === split.transactionId)
      )
      .sort((a, b) => {
        const txA = transactions.find((t) => t.id === a.transactionId);
        const txB = transactions.find((t) => t.id === b.transactionId);
        if (!txA || !txB) return 0;
        return new Date(txB.date).getTime() - new Date(txA.date).getTime();
      });
  }, [friend, splitExpenses, transactions]);

  if (!friend) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.textSecondary }}>Friend not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwed = balance > 0;
  const isOwe = balance < 0;
  const isSettled = balance === 0;

  const badgeBg = isOwed
    ? colors.incomeLight
    : isOwe
    ? colors.expenseLight
    : colors.pastelNeutral;

  const badgeText = isOwed
    ? colors.income
    : isOwe
    ? colors.expense
    : colors.pastelNeutralText;

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
        <Text
          style={[styles.headerTitle, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {friend.name}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/friends/edit' as any,
                params: { id: friend.id },
              })
            }
            activeOpacity={0.7}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Edit2 size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.lg },
        ]}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard} padding="lg">
          <Avatar name={friend.name} color={friend.avatarColor} size={64} />
          <Text style={[styles.friendName, { color: colors.textPrimary }]}>
            {friend.name}
          </Text>
          {Boolean(friend.phone) && (
            <Text style={[styles.friendPhone, { color: colors.textTertiary }]}>
              {friend.phone}
            </Text>
          )}

          {/* Balance Status Header with unambiguous direction */}
          <View style={styles.balanceWrap}>
            <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
              {isOwed
                ? `${friend.name} owes you`
                : isOwe
                ? `You owe ${friend.name}`
                : 'Settled'}
            </Text>
            <View style={[styles.balancePill, { backgroundColor: badgeBg }]}>
              <Text style={[styles.balanceAmount, { color: badgeText }]}>
                {!isSettled
                  ? formatCurrency(Math.abs(balance))
                  : '₹0'}
              </Text>
            </View>
          </View>

          {/* Settle Up Action */}
          {!isSettled && (
            <View style={styles.settleBtnWrap}>
              <Button
                title="Settle Up"
                icon={<HandCoins size={18} color="#000000" />}
                onPress={() =>
                  router.push({
                    pathname: '/friends/settle' as any,
                    params: { friendId: friend.id },
                  })
                }
                size="lg"
                fullWidth
              />
            </View>
          )}
        </Card>

        {/* Split History Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SHARED EXPENSES ({splits.length})
          </Text>
        </View>

        {splits.length === 0 ? (
          <Card style={styles.emptyCard} padding="lg">
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              No shared expenses with {friend.name} yet.
            </Text>
          </Card>
        ) : (
          splits.map((split) => {
            const transaction = transactions.find(
              (t) => t.id === split.transactionId
            );
            const isFriendPaid =
              split.paidByType === 'friend' && split.paidByFriendId === friend.id;
            const friendParticipant = split.participants?.find(
              (p) => p.friendId === friend.id
            );
            const myParticipant = split.participants?.find(
              (p) => p.friendId === null
            );

            // Bilateral relevant amount
            const relevantAmount = isFriendPaid
              ? myParticipant?.amount || 0
              : friendParticipant?.amount || 0;
            const itemSettled = isFriendPaid
              ? Boolean(myParticipant?.isPaid)
              : Boolean(friendParticipant?.isPaid);

            const itemPillBg = itemSettled
              ? colors.pastelNeutral
              : isFriendPaid
              ? colors.expenseLight
              : colors.incomeLight;
            const itemPillText = itemSettled
              ? colors.pastelNeutralText
              : isFriendPaid
              ? colors.expense
              : colors.income;

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
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  shadows.sm,
                ]}
              >
                <View style={styles.splitItemLeft}>
                  <Text
                    style={[styles.splitTitle, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {transaction?.note || 'Split Expense'}
                  </Text>
                  <Text
                    style={[
                      styles.splitDate,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {transaction ? formatRelativeDate(transaction.date) : ''}
                    {isFriendPaid
                      ? ` · Paid by ${friend.name} (${formatCurrency(split.totalAmount)})`
                      : ` · Paid by You (${formatCurrency(split.totalAmount)})`}
                  </Text>
                </View>

                <View style={styles.splitItemRight}>
                  <View style={[styles.pillBadge, { backgroundColor: itemPillBg }]}>
                    <Text style={[styles.pillText, { color: itemPillText }]}>
                      {itemSettled
                        ? 'Settled'
                        : (isFriendPaid ? '-' : '+') + formatCurrency(relevantAmount)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </View>
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    marginHorizontal: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  friendName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    marginTop: spacing.sm,
  },
  friendPhone: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    marginTop: 2,
  },
  balanceWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  balanceCaption: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  balancePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  balanceAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  settleBtnWrap: {
    width: '100%',
    marginTop: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  splitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  splitItemLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  splitTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  splitDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  splitItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  pillText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.semiBold,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
