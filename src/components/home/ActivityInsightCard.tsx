import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/store/transactionStore';
import { useSplitStore } from '@/store/splitStore';
import { getUserPersonalExpense } from '@/utils/calculations';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

interface ActivityInsightCardProps {
  style?: ViewStyle;
}

export const ActivityInsightCard: React.FC<ActivityInsightCardProps> = ({ style }) => {
  const router = useRouter();
  const { colors } = useTheme();
  const transactions = useTransactionStore((s) => s.transactions);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);

  const { dailyAverage, weekComparison } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter personal expenses for current month
    const thisMonthExpenses = transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        t.type === 'expense' &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    });

    const totalSpent = thisMonthExpenses.reduce((sum, t) => {
      const split = splitExpenses.find((s) => s.transactionId === t.id);
      return sum + getUserPersonalExpense(t, split);
    }, 0);

    const dayOfMonth = Math.max(now.getDate(), 1);
    const avg = Math.round(totalSpent / dayOfMonth);

    // Week comparison: Last 7 days vs previous 7 days
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now.getTime() - 7 * oneDayMs);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * oneDayMs);

    let thisWeekSpent = 0;
    let lastWeekSpent = 0;

    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const d = new Date(t.date);
      const split = splitExpenses.find((s) => s.transactionId === t.id);
      const amount = getUserPersonalExpense(t, split);

      if (d >= sevenDaysAgo && d <= now) {
        thisWeekSpent += amount;
      } else if (d >= fourteenDaysAgo && d < sevenDaysAgo) {
        lastWeekSpent += amount;
      }
    }

    let comparisonText = 'Keep tracking to unlock deeper insights';
    if (lastWeekSpent > 0) {
      const diff = ((thisWeekSpent - lastWeekSpent) / lastWeekSpent) * 100;
      const roundedDiff = Math.abs(Math.round(diff));
      if (diff < 0) {
        comparisonText = `You spent ${roundedDiff}% less this week compared to last week`;
      } else if (diff > 0) {
        comparisonText = `You spent ${roundedDiff}% more this week compared to last week`;
      } else {
        comparisonText = 'Your spending this week matches last week';
      }
    } else if (thisWeekSpent > 0) {
      comparisonText = `You spent ${formatCurrency(thisWeekSpent)} in the past 7 days`;
    }

    return {
      dailyAverage: avg,
      weekComparison: comparisonText,
    };
  }, [transactions, splitExpenses]);

  return (
    <TouchableOpacity
      onPress={() => router.push('/insights')}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadows.sm,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.incomeLight },
        ]}
      >
        <TrendingUp size={20} color={colors.income} strokeWidth={2.2} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Daily spending average: {formatCurrency(dailyAverage)}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {weekComparison}
        </Text>
      </View>

      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: typography.fontFamily.semiBold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily.regular,
  },
});
