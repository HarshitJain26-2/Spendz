import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { MonthSummary } from '@/types';

interface MonthSummaryProps {
  summary: MonthSummary;
  onPress?: () => void;
}

export const MonthSummaryCard: React.FC<MonthSummaryProps> = ({
  summary,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.delay(400).duration(500)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              This Month
            </Text>
            {onPress && (
              <View style={styles.seeMore}>
                <Text style={[styles.seeMoreText, { color: colors.accent }]}>
                  See Insights
                </Text>
                <ChevronRight size={14} color={colors.accent} />
              </View>
            )}
          </View>

          <View style={styles.cards}>
            {/* Income */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.incomeLight },
              ]}
            >
              <View style={styles.cardHeader}>
                <TrendingUp size={16} color={colors.income} strokeWidth={2} />
                <Text
                  style={[styles.cardLabel, { color: colors.income }]}
                >
                  Income
                </Text>
              </View>
              <Text
                style={[styles.cardAmount, { color: colors.income }]}
              >
                {formatCurrency(summary.income)}
              </Text>
            </View>

            {/* Spent */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.expenseLight },
              ]}
            >
              <View style={styles.cardHeader}>
                <TrendingDown size={16} color={colors.expense} strokeWidth={2} />
                <Text
                  style={[styles.cardLabel, { color: colors.expense }]}
                >
                  Spent
                </Text>
              </View>
              <Text
                style={[styles.cardAmount, { color: colors.expense }]}
              >
                {formatCurrency(summary.expense)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
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
  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeMoreText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  cards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  cardAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
    letterSpacing: -0.5,
  },
});
