import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
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
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            This Month
          </Text>
          {onPress && (
            <TouchableOpacity
              onPress={onPress}
              style={styles.seeMore}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeMoreText, { color: colors.accent }]}>
                See Insights
              </Text>
              <ChevronRight size={14} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardsRow}>
          {/* Income Card */}
          <Card
            style={styles.metricCard}
            padding="md"
            onPress={onPress}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.incomeLight },
                ]}
              >
                <TrendingUp size={16} color={colors.income} strokeWidth={2.4} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                INCOME
              </Text>
            </View>
            <Text
              style={[styles.cardAmount, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {formatCurrency(summary.income)}
            </Text>
          </Card>

          {/* Spent Card */}
          <Card
            style={styles.metricCard}
            padding="md"
            onPress={onPress}
          >
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: colors.expenseLight },
                ]}
              >
                <TrendingDown size={16} color={colors.expense} strokeWidth={2.4} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                SPENT
              </Text>
            </View>
            <Text
              style={[styles.cardAmount, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {formatCurrency(summary.expense)}
            </Text>
          </Card>
        </View>
      </View>
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
    gap: 2,
  },
  seeMoreText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.bodySmall,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  cardAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
});
