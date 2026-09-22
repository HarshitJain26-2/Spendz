import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useSplitStore } from '@/store/splitStore';
import { Card } from '@/components/ui/Card';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { ComparisonBar } from '@/components/charts/ComparisonBar';
import { formatCurrency } from '@/utils/currency';
import { formatMonth } from '@/utils/date';
import { getUserPersonalExpense } from '@/utils/calculations';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { CategoryBreakdown } from '@/types';

export default function InsightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Month date range
  const { income, expense, saved, categoryBreakdown } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const mTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    let inc = 0;
    let exp = 0;
    const catMap: Record<string, { amount: number; count: number }> = {};

    for (const t of mTransactions) {
      if (t.type === 'income') {
        inc += t.amount;
      } else if (t.type === 'expense') {
        const split = splitExpenses.find((s) => s.transactionId === t.id);
        const effectiveAmount = getUserPersonalExpense(t, split);

        exp += effectiveAmount;
        const catId = t.categoryId || 'uncategorized';
        if (!catMap[catId]) {
          catMap[catId] = { amount: 0, count: 0 };
        }
        catMap[catId].amount += effectiveAmount;
        catMap[catId].count += 1;
      }
    }

    const breakdown: CategoryBreakdown[] = Object.keys(catMap)
      .map((catId) => {
        const cat = getCategoryById(catId) || {
          id: 'uncategorized',
          name: 'Other',
          icon: 'MoreHorizontal',
          color: '#94A3B8',
          type: 'expense' as const,
          isDefault: true,
          createdAt: '',
        };
        const amount = catMap[catId].amount;
        const percentage = exp > 0 ? Math.round((amount / exp) * 100) : 0;

        return {
          categoryId: catId,
          category: cat,
          amount,
          percentage,
          count: catMap[catId].count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      income: inc,
      expense: exp,
      saved: inc - exp,
      categoryBreakdown: breakdown,
    };
  }, [transactions, currentDate, categories, getCategoryById, splitExpenses]);

  const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Insights
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Selector Card */}
        <Card padding="none" style={styles.monthSelectorCard}>
          <View style={styles.monthSelectorRow}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.chevronBtn}>
              <ChevronLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.monthText, { color: colors.textPrimary }]}>
              {formatMonth(currentDate)}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.chevronBtn}>
              <ChevronRight size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* 3 Metric Cards */}
        <View style={styles.metricGrid}>
          {/* Income */}
          <Card style={styles.metricCard} padding="md">
            <View style={styles.metricLabelRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
                <TrendingUp size={14} color={colors.income} strokeWidth={2.4} />
              </View>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                INCOME
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.income }]}>
              {formatCurrency(income)}
            </Text>
          </Card>

          {/* Spent */}
          <Card style={styles.metricCard} padding="md">
            <View style={styles.metricLabelRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.expenseLight }]}>
                <TrendingDown size={14} color={colors.expense} strokeWidth={2.4} />
              </View>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                SPENT
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.expense }]}>
              {formatCurrency(expense)}
            </Text>
          </Card>

          {/* Saved */}
          <Card style={styles.metricCard} padding="md">
            <View style={styles.metricLabelRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
                <PiggyBank size={14} color={colors.accent} strokeWidth={2.4} />
              </View>
              <Text
                style={[styles.metricLabel, { color: colors.textSecondary }]}
              >
                SAVED
              </Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                { color: saved >= 0 ? colors.accent : colors.expense },
              ]}
            >
              {formatCurrency(saved)}
            </Text>
          </Card>
        </View>

        {/* Smart Insight Banner */}
        {income > 0 && (
          <Card
            style={styles.insightBanner}
            padding="md"
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Sparkles size={16} color={colors.accent} strokeWidth={2.2} />
            </View>
            <Text style={[styles.insightText, { color: colors.textPrimary }]}>
              {savingsRate > 0
                ? `You saved ${savingsRate}% of your total income this month. Great financial health!`
                : `You spent more than your income this month. Keep an eye on non-essential expenses.`}
            </Text>
          </Card>
        )}

        {/* Ratio Bar */}
        <ComparisonBar income={income} expense={expense} />

        {/* Category Chart */}
        <CategoryChart
          data={categoryBreakdown}
          totalExpense={expense}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 40,
    gap: spacing.md,
  },
  monthSelectorCard: {
    borderRadius: borderRadius.xl,
  },
  monthSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chevronBtn: {
    padding: 6,
  },
  monthText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    gap: spacing.xs,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  insightText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.small,
    lineHeight: 18,
  },
});
