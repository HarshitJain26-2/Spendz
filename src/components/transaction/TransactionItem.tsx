import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Landmark } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { getCategoryEmoji } from './CategorySelectorCard';
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

  const emoji =
    transaction.type === 'transfer'
      ? '🔄'
      : getCategoryEmoji(category?.id, category?.name);

  const formatTransactionTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const getDisplayInfo = () => {
    const timeStr = formatTransactionTime(transaction.createdAt || transaction.date);
    const subTime = timeStr ? ` · ${timeStr}` : '';

    switch (transaction.type) {
      case 'expense':
        return {
          title: transaction.note || category?.name || 'Expense',
          categoryBadge: category?.name || 'Expense',
          subtitle: `${account?.name || 'Account'}${subTime}`,
          amount: `-${formatCurrency(transaction.amount)}`,
          amountColor: colors.textPrimary,
          subLabel: transaction.note && category ? category.name : 'Personal',
        };
      case 'income':
        return {
          title: transaction.note || category?.name || 'Income',
          categoryBadge: category?.name || 'Income',
          subtitle: `${account?.name || 'Account'}${subTime}`,
          amount: `+${formatCurrency(transaction.amount)}`,
          amountColor: colors.income,
          subLabel: 'Credited',
        };
      case 'transfer':
        return {
          title: transaction.note || 'ATM Withdrawal',
          categoryBadge: 'Transfer',
          subtitle: `${account?.name || ''} → ${toAccount?.name || ''}${subTime}`,
          amount: formatCurrency(transaction.amount),
          amountColor: colors.textPrimary,
          subLabel: 'Self',
        };
    }
  };

  const info = getDisplayInfo();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={styles.container}
    >
      {/* Category Emoji Icon */}
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Info Column */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {info.title}
          </Text>
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
              numberOfLines={1}
            >
              {info.categoryBadge}
            </Text>
          </View>
        </View>

        <View style={styles.subRow}>
          <Landmark size={12} color={colors.textTertiary} strokeWidth={2} />
          <Text
            style={[styles.subtitle, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {info.subtitle}
          </Text>
        </View>
      </View>

      {/* Amount Column */}
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: info.amountColor },
          ]}
        >
          {info.amount}
        </Text>
        <Text
          style={[styles.subLabel, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {info.subLabel}
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
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    maxWidth: '70%',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    marginBottom: 2,
  },
  subLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
});

