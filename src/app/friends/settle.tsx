import React, { useState, useMemo } from 'react';
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
import { ArrowLeft, CheckCircle2, HandCoins } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useAccountStore } from '@/store/accountStore';
import { useTransactionStore } from '@/store/transactionStore';
import { AccountPicker } from '@/components/transaction/AccountPicker';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function SettleScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const friends = useFriendStore((s) => s.friends);
  const friend = useMemo(
    () => friends.find((f) => f.id === friendId),
    [friends, friendId]
  );
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const splits = useMemo(
    () =>
      splitExpenses.filter((split) =>
        split.participants?.some((p) => p.friendId === friendId)
      ),
    [splitExpenses, friendId]
  );
  const settleSplitParticipant = useSplitStore(
    (s) => s.settleSplitParticipant
  );
  const accounts = useAccountStore((s) => s.accounts);
  const addTransaction = useTransactionStore((s) => s.addTransaction);

  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [recordIncome, setRecordIncome] = useState(true);

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

  // Find all unsettled participant entries for this friend
  const unsettledItems: Array<{
    splitId: string;
    participantId: string;
    amount: number;
    transactionId: string;
  }> = [];

  for (const split of splits) {
    const participant = split.participants?.find(
      (p) => p.friendId === friend.id && !p.isPaid
    );
    if (participant) {
      unsettledItems.push({
        splitId: split.id,
        participantId: participant.id,
        amount: participant.amount,
        transactionId: split.transactionId,
      });
    }
  }

  const totalOwed = unsettledItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSettle = () => {
    if (unsettledItems.length === 0) {
      router.back();
      return;
    }

    // Mark all as settled
    for (const item of unsettledItems) {
      settleSplitParticipant(item.splitId, item.participantId);
    }

    // If recordIncome is enabled, deposit to selected account
    if (recordIncome && accountId && totalOwed > 0) {
      addTransaction({
        type: 'income',
        amount: totalOwed,
        accountId,
        categoryId: null,
        note: `Settlement from ${friend.name}`,
        date: getTodayISO(),
      });
    }

    Alert.alert(
      'Settled!',
      `Successfully settled ${formatCurrency(totalOwed)} with ${friend.name}.`,
      [{ text: 'OK', onPress: () => router.back() }]
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Settle Up
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Amount Card */}
        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
            Total to settle with {friend.name}
          </Text>
          <Text style={[styles.amountValue, { color: colors.income }]}>
            {formatCurrency(totalOwed)}
          </Text>
          <Text style={[styles.itemCount, { color: colors.textTertiary }]}>
            {unsettledItems.length} unsettled shared{' '}
            {unsettledItems.length === 1 ? 'expense' : 'expenses'}
          </Text>
        </View>

        {/* Deposit account selector */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Deposit To Account
          </Text>
        </View>
        <AccountPicker
          accounts={accounts}
          selectedId={accountId}
          onSelect={(a) => setAccountId(a.id)}
        />

        {/* Option toggle */}
        <TouchableOpacity
          onPress={() => setRecordIncome(!recordIncome)}
          style={[
            styles.toggleRow,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.toggleTextWrap}>
            <Text
              style={[styles.toggleTitle, { color: colors.textPrimary }]}
            >
              Add to Account Balance
            </Text>
            <Text
              style={[styles.toggleDesc, { color: colors.textSecondary }]}
            >
              Record an incoming transaction of {formatCurrency(totalOwed)}
            </Text>
          </View>
          <CheckCircle2
            size={22}
            color={recordIncome ? colors.accent : colors.border}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Settle CTA */}
      <View style={styles.bottom}>
        <Button
          title={`Confirm Settlement (${formatCurrency(totalOwed)})`}
          onPress={handleSettle}
          size="lg"
          fullWidth
          disabled={totalOwed <= 0}
        />
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
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  amountCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
  },
  amountLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.hero,
  },
  itemCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.small,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  toggleDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
