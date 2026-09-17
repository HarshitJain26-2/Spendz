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
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  Tag,
  FileText,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAccountStore } from '@/store/accountStore';
import { useSplitStore } from '@/store/splitStore';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency } from '@/utils/currency';
import { formatFullDateTime } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

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
            <ArrowLeft size={24} color={colors.textPrimary} />
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

  const handleDelete = () => {
    Alert.alert(
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

  const getTypeTheme = () => {
    switch (transaction.type) {
      case 'expense':
        return {
          label: 'Expense',
          color: colors.expense,
          sign: '-',
          icon: <ArrowDownLeft size={20} color={colors.expense} />,
        };
      case 'income':
        return {
          label: 'Income',
          color: colors.income,
          sign: '+',
          icon: <ArrowUpRight size={20} color={colors.income} />,
        };
      case 'transfer':
        return {
          label: 'Transfer',
          color: colors.transfer,
          sign: '',
          icon: <ArrowLeftRight size={20} color={colors.transfer} />,
        };
    }
  };

  const typeTheme = getTypeTheme();

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
          Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/transaction/edit' as any,
                params: { id: transaction.id },
              })
            }
            activeOpacity={0.7}
            style={styles.actionBtn}
          >
            <Edit2 size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.7}
            style={styles.actionBtn}
          >
            <Trash2 size={20} color={colors.expense} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: typeTheme.color + '18' },
            ]}
          >
            {typeTheme.icon}
            <Text style={[styles.typeText, { color: typeTheme.color }]}>
              {typeTheme.label}
            </Text>
          </View>

          <Text style={[styles.amountText, { color: typeTheme.color }]}>
            {typeTheme.sign}
            {formatCurrency(transaction.amount)}
          </Text>

          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatFullDateTime(transaction.date)}
          </Text>
        </View>

        {/* Details List */}
        <View
          style={[
            styles.detailsCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Category */}
          {transaction.type !== 'transfer' && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Tag size={18} color={colors.textTertiary} />
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                  Category
                </Text>
              </View>
              <View style={styles.rowRight}>
                {category ? (
                  <View style={styles.categoryBadge}>
                    <DynamicIcon
                      name={category.icon}
                      size={16}
                      color={category.color}
                    />
                    <Text
                      style={[
                        styles.categoryName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: colors.textTertiary }}>
                    Uncategorized
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Account */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <CreditCard size={18} color={colors.textTertiary} />
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                {transaction.type === 'transfer' ? 'From Account' : 'Account'}
              </Text>
            </View>
            <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
              {account?.name || 'Unknown Account'}
            </Text>
          </View>

          {/* To Account (if transfer) */}
          {transaction.type === 'transfer' && toAccount && (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <CreditCard size={18} color={colors.textTertiary} />
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                  To Account
                </Text>
              </View>
              <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
                {toAccount.name}
              </Text>
            </View>
          )}

          {/* Note */}
          {Boolean(transaction.note) && (
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View style={styles.rowLeft}>
                <FileText size={18} color={colors.textTertiary} />
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                  Note
                </Text>
              </View>
              <Text
                style={[
                  styles.rowValue,
                  { color: colors.textPrimary, flex: 1, textAlign: 'right' },
                ]}
              >
                {transaction.note}
              </Text>
            </View>
          )}
        </View>

        {/* Split Details (if linked) */}
        {splitExpense && splitExpense.participants && (
          <View
            style={[
              styles.splitCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.splitHeader}>
              <View style={styles.splitTitleWrap}>
                <Users size={18} color={colors.accent} />
                <Text
                  style={[styles.splitTitle, { color: colors.textPrimary }]}
                >
                  Split Details
                </Text>
              </View>
              <Badge
                variant={
                  splitExpense.status === 'settled' ? 'success' : 'warning'
                }
              >
                {splitExpense.status.toUpperCase()}
              </Badge>
            </View>

            {splitExpense.participants.map((p) => (
              <View
                key={p.id}
                style={[styles.participantRow, { borderTopColor: colors.border }]}
              >
                <View style={styles.participantLeft}>
                  <Avatar name={p.name} size={32} />
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
                  {p.isPaid ? (
                    <View style={styles.statusPaid}>
                      <CheckCircle2 size={14} color={colors.income} />
                      <Text style={{ color: colors.income, fontSize: 12 }}>
                        Paid
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statusUnpaid}>
                      <Clock size={14} color={colors.expense} />
                      <Text style={{ color: colors.expense, fontSize: 12 }}>
                        Owes
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    padding: 4,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  typeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.small,
  },
  amountText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.hero,
  },
  dateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.small,
  },
  detailsCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  splitCard: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  splitTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h4,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  participantName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  participantRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  participantAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  statusPaid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusUnpaid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
