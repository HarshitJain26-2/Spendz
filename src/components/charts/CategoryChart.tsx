import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { CategoryBreakdown } from '@/types';

interface CategoryChartProps {
  data: CategoryBreakdown[];
  totalExpense: number;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({
  data,
  totalExpense,
}) => {
  const { colors } = useTheme();

  if (data.length === 0 || totalExpense === 0) {
    return (
      <Card padding="lg" style={styles.emptyContainer}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          No expense data for this period
        </Text>
      </Card>
    );
  }

  return (
    <Card padding="lg" style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Spending by Category
      </Text>

      {/* Multi-segmented visual bar */}
      <View style={styles.barContainer}>
        {data.map((item) => (
          <View
            key={item.categoryId}
            style={[
              styles.barSegment,
              {
                backgroundColor: item.category.color,
                flex: Math.max(item.percentage, 1),
              },
            ]}
          />
        ))}
      </View>

      {/* Category Breakdown Rows */}
      <View style={styles.list}>
        {data.map((item) => (
          <View key={item.categoryId} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${item.category.color}15` },
                ]}
              >
                <DynamicIcon
                  name={item.category.icon}
                  size={18}
                  color={item.category.color}
                />
              </View>
              <View>
                <Text
                  style={[styles.categoryName, { color: colors.textPrimary }]}
                >
                  {item.category.name}
                </Text>
                <Text
                  style={[styles.categoryPercent, { color: colors.textTertiary }]}
                >
                  {item.percentage}% of total • {item.count}{' '}
                  {item.count === 1 ? 'transaction' : 'transactions'}
                </Text>
              </View>
            </View>

            <Text style={[styles.itemAmount, { color: colors.textPrimary }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
  },
  barContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    gap: 2,
    marginVertical: spacing.xs,
  },
  barSegment: {
    height: '100%',
    borderRadius: 2,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    marginBottom: 2,
  },
  categoryPercent: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  itemAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
});
