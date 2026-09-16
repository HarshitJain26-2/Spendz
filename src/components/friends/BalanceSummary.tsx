import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface BalanceSummaryProps {
  youAreOwed: number;
  youOwe: number;
}

export const BalanceSummary: React.FC<BalanceSummaryProps> = ({
  youAreOwed,
  youOwe,
}) => {
  const { colors } = useTheme();
  const net = youAreOwed - youOwe;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {/* You are owed */}
        <View style={styles.column}>
          <View style={styles.labelRow}>
            <TrendingUp size={16} color={colors.income} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              You are owed
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.income }]}>
            {formatCurrency(youAreOwed)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* You owe */}
        <View style={styles.column}>
          <View style={styles.labelRow}>
            <TrendingDown size={16} color={colors.expense} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              You owe
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.expense }]}>
            {formatCurrency(youOwe)}
          </Text>
        </View>
      </View>

      {/* Net Bar */}
      <View style={[styles.netRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.netLabel, { color: colors.textTertiary }]}>
          Net Balance:
        </Text>
        <Text
          style={[
            styles.netAmount,
            {
              color:
                net > 0
                  ? colors.income
                  : net < 0
                    ? colors.expense
                    : colors.textSecondary,
            },
          ]}
        >
          {net > 0 ? `+${formatCurrency(net)}` : formatCurrency(net)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  amount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  divider: {
    width: 1,
    height: 40,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
  },
  netLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  netAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.small,
  },
});
