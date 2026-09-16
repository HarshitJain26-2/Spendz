import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeDate } from '@/utils/date';
import { useCategoryStore } from '@/store/categoryStore';
import { useAccountStore } from '@/store/accountStore';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { Transaction } from '@/types';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
}) => {
  const { colors } = useTheme();
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);
  const accounts = useAccountStore((s) => s.accounts);

  const category = transaction.categoryId
    ? getCategoryById(transaction.categoryId)
    : null;
  const account = accounts.find((a) => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId
    ? accounts.find((a) => a.id === transaction.toAccountId)
    : null;

  const getDisplayInfo = () => {
    switch (transaction.type) {
      case 'expense':
        return {
          icon: category ? (
            <DynamicIcon
              name={category.icon}
              size={20}
              color={category.color}
            />
          ) : (
            <ArrowDownLeft size={20} color={colors.expense} />
          ),
          iconBg: category ? `${category.color}20` : colors.expenseLight,
          title: category?.name || 'Expense',
          subtitle: transaction.note || account?.name || '',
          amount: `-${formatCurrency(transaction.amount)}`,
          amountColor: colors.expense,
        };
      case 'income':
        return {
          icon: category ? (
            <DynamicIcon
              name={category.icon}
              size={20}
              color={category.color}
            />
          ) : (
            <ArrowUpRight size={20} color={colors.income} />
          ),
          iconBg: category ? `${category.color}20` : colors.incomeLight,
          title: category?.name || 'Income',
          subtitle: transaction.note || account?.name || '',
          amount: `+${formatCurrency(transaction.amount)}`,
          amountColor: colors.income,
        };
      case 'transfer':
        return {
          icon: <ArrowLeftRight size={20} color={colors.transfer} />,
          iconBg: colors.transferLight,
          title: 'Transfer',
          subtitle: `${account?.name || ''} → ${toAccount?.name || ''}`,
          amount: formatCurrency(transaction.amount),
          amountColor: colors.transfer,
        };
    }
  };

  const info = getDisplayInfo();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
      style={styles.container}
    >
      {/* Icon */}
      <View style={[styles.icon, { backgroundColor: info.iconBg }]}>
        {info.icon}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {info.title}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {info.subtitle}
        </Text>
      </View>

      {/* Amount + Date */}
      <View style={styles.right}>
        <Text style={[styles.amount, { color: info.amountColor }]}>
          {info.amount}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatRelativeDate(transaction.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  date: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
});
