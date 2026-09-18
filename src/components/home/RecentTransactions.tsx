import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronRight, Receipt } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { TransactionItem } from '@/components/transaction/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { Transaction } from '@/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll?: () => void;
  onTransactionPress?: (transaction: Transaction) => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
  onTransactionPress,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.delay(600).duration(500)}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Recent Transactions
        </Text>
        {transactions.length > 0 && onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            style={styles.viewAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: colors.accent }]}>
              View All
            </Text>
            <ChevronRight size={14} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<Receipt size={32} color={colors.accent} />}
          title="No transactions yet"
          description="Add your first transaction to start tracking your spending."
        />
      ) : (
        <View style={styles.list}>
          {transactions.map((transaction) => (
            <View
              key={transaction.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                shadows.sm,
              ]}
            >
              <TransactionItem
                transaction={transaction}
                onPress={
                  onTransactionPress
                    ? () => onTransactionPress(transaction)
                    : undefined
                }
              />
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h3,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.bodySmall,
  },
  list: {
    gap: spacing.sm,
  },
  itemCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
