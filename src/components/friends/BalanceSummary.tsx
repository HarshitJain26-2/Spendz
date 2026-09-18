import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
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
    <Card style={styles.card} padding="lg">
      <View style={styles.row}>
        {/* You are owed */}
        <View style={styles.column}>
          <View style={styles.labelRow}>
            <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
              <TrendingUp size={14} color={colors.income} strokeWidth={2.4} />
            </View>
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
            <View style={[styles.iconWrap, { backgroundColor: colors.expenseLight }]}>
              <TrendingDown size={14} color={colors.expense} strokeWidth={2.4} />
            </View>
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
          Net Split Balance
        </Text>
        <View
          style={[
            styles.netPill,
            {
              backgroundColor:
                net > 0
                  ? colors.incomeLight
                  : net < 0
                  ? colors.expenseLight
                  : colors.pastelNeutral,
            },
          ]}
        >
          <Text
            style={[
              styles.netAmount,
              {
                color:
                  net > 0
                    ? colors.income
                    : net < 0
                    ? colors.expense
                    : colors.pastelNeutralText,
              },
            ]}
          >
            {net > 0 ? `+${formatCurrency(net)}` : formatCurrency(net)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
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
    gap: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  amount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  divider: {
    width: 1,
    height: 44,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  netLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  netPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  netAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 13,
  },
});
