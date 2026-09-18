import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface ComparisonBarProps {
  income: number;
  expense: number;
}

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  income,
  expense,
}) => {
  const { colors } = useTheme();

  const total = income + expense;
  const incomePercent = total > 0 ? Math.round((income / total) * 100) : 50;
  const expensePercent = total > 0 ? Math.round((expense / total) * 100) : 50;

  return (
    <Card padding="lg" style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Cash Flow Ratio
      </Text>

      {/* Visual Bar */}
      <View style={styles.bar}>
        <View
          style={[
            styles.segment,
            {
              backgroundColor: colors.income,
              flex: incomePercent,
            },
          ]}
        />
        <View
          style={[
            styles.segment,
            {
              backgroundColor: colors.expense,
              flex: expensePercent,
            },
          ]}
        />
      </View>

      {/* Labels */}
      <View style={styles.labels}>
        <View style={styles.labelCol}>
          <View style={styles.dotLabel}>
            <View style={[styles.dot, { backgroundColor: colors.income }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Income ({incomePercent}%)
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.income }]}>
            {formatCurrency(income)}
          </Text>
        </View>

        <View style={[styles.labelCol, { alignItems: 'flex-end' }]}>
          <View style={styles.dotLabel}>
            <View style={[styles.dot, { backgroundColor: colors.expense }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Expense ({expensePercent}%)
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.expense }]}>
            {formatCurrency(expense)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    gap: 3,
  },
  segment: {
    height: '100%',
    borderRadius: 2,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelCol: {
    gap: 4,
  },
  dotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  amount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
});
