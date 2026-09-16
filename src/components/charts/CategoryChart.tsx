import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
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
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>
          No expense data for this period
        </Text>
      </View>
    );
  }

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
                  { backgroundColor: `${item.category.color}20` },
                ]}
              >
                <DynamicIcon
                  name={item.category.icon}
                  size={16}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h4,
  },
  barContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
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
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  categoryPercent: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.tiny,
  },
  itemAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  emptyContainer: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
});
