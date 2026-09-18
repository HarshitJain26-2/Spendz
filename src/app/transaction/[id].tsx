import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Landmark,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAccountStore } from '@/store/accountStore';
import { useSplitStore } from '@/store/splitStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { getCategoryEmoji } from '@/components/transaction/CategorySelectorCard';
import { formatCurrency } from '@/utils/currency';
import { formatFullDateTime } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { showAlert } from '@/utils/alert';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const transactions = useTransactionStore((s) => s.transactions);
  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id]
  );
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);
  const accounts = useAccountStore((s) => s.accounts);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const splitExpense = useMemo(
    () => splitExpenses.find((s) => s.transactionId === id),
    [splitExpenses, id]
  );

  if (!transaction) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.textSecondary }}>
            Transaction not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const category = transaction.categoryId
    ? getCategoryById(transaction.categoryId)
    : null;
  const account = accounts.find((a) => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : null;

  const emoji =
    transaction.type === 'transfer'
      ? '🔄'
      : getCategoryEmoji(category?.id, category?.name);

  const handleDelete = () => {
    showAlert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This will reverse its effect on your account balances.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTransaction(transaction.id);
            router.back();
          },
        },
      ]
    );
  };

  const isIncome = transaction.type === 'income';
  const isExpense = transaction.type === 'expense';
  const amountSign = isExpense ? '-' : isIncome ? '+' : '';
  const amountColor = isIncome ? colors.income : colors.textPrimary;

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Transaction
        </Text>
        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.7}
          style={[
            styles.deleteIconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Trash2 size={18} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Hero Section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.emojiBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.sm,
            ]}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>

          <Text
            style={[styles.transactionTitle, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {transaction.note || category?.name || 'Transaction'}
          </Text>

          {category && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: colors.textSecondary },
                ]}
              >
                {category.name}
              </Text>
            </View>
          )}

          <Text style={[styles.amountText, { color: amountColor }]}>
            {amountSign}
            {formatCurrency(transaction.amount)}
          </Text>
        </View>

        {/* Details Card */}
        <Card style={styles.detailsCard} padding="lg">
          {/* Paid From */}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              {transaction.type === 'transfer' ? 'FROM ACCOUNT' : 'PAID FROM'}
            </Text>
            <View style={styles.accountValRow}>
              <Landmark size={16} color={colors.textSecondary} />
              <Text
                style={[styles.detailValue, { color: colors.textPrimary }]}
              >
                {account?.name || 'Account'}
              </Text>
            </View>
          </View>

          {/* To Account (if transfer) */}
          {transaction.type === 'transfer' && toAccount && (
            <View style={[styles.detailRow, styles.rowBorderTop, { borderTopColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                TO ACCOUNT
              </Text>
              <View style={styles.accountValRow}>
                <Landmark size={16} color={colors.textSecondary} />
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {toAccount.name}
                </Text>
              </View>
            </View>
          )}

          {/* Date & Time */}
          <View style={[styles.detailRow, styles.rowBorderTop, { borderTopColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              DATE & TIME
            </Text>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {formatFullDateTime(transaction.date)}
            </Text>
          </View>

          {/* Note */}
          {Boolean(transaction.note) && (
            <View style={[styles.detailRow, styles.rowBorderTop, { borderTopColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                NOTE
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {transaction.note}
              </Text>
            </View>
          )}
        </Card>

        {/* Split Details Card (if linked) */}
        {splitExpense && splitExpense.participants && (
          <Card style={styles.detailsCard} padding="lg">
            <View style={styles.splitHeader}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                SPLIT PARTICIPANTS ({splitExpense.participants.length})
              </Text>
              <View
                style={[
                  styles.splitStatusPill,
                  {
                    backgroundColor:
                      splitExpense.status === 'settled'
                        ? colors.incomeLight
                        : colors.pastelNeutral,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.splitStatusText,
                    {
                      color:
                        splitExpense.status === 'settled'
                          ? colors.income
                          : colors.pastelNeutralText,
                    },
                  ]}
                >
                  {splitExpense.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {splitExpense.participants.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.participantRow,
                  idx > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                ]}
              >
                <View style={styles.participantLeft}>
                  <Avatar name={p.name} size={34} />
                  <Text
                    style={[
                      styles.participantName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {p.name}
                  </Text>
                </View>

                <View style={styles.participantRight}>
                  <Text
                    style={[
                      styles.participantAmount,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {formatCurrency(p.amount)}
                  </Text>
                  <View
                    style={[
                      styles.partStatusBadge,
                      {
                        backgroundColor: p.isPaid
                          ? colors.incomeLight
                          : colors.expenseLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.partStatusText,
                        { color: p.isPaid ? colors.income : colors.expense },
                      ]}
                    >
                      {p.isPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Edit Transaction"
            icon={<Edit2 size={18} color="#000000" />}
            onPress={() =>
              router.push({
                pathname: '/transaction/edit' as any,
                params: { id: transaction.id },
              })
            }
            size="lg"
            fullWidth
          />
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
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  emojiBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  emojiText: {
    fontSize: 30,
  },
  transactionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 22,
    textAlign: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: 2,
  },
  categoryBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  amountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 34,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  detailsCard: {
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  detailRow: {
    gap: 4,
  },
  rowBorderTop: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  detailLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  detailValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  accountValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  splitStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  splitStatusText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  participantRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  partStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  partStatusText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 11,
  },
  actions: {
    marginTop: spacing.xs,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
