import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Bell,
  SlidersHorizontal,
  Calendar,
  TrendingDown,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useBottomTabInset } from '@/hooks/useBottomTabInset';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAppStore } from '@/store/appStore';
import { TransactionItem } from '@/components/transaction/TransactionItem';
import { ActivityInsightCard } from '@/components/home/ActivityInsightCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatActivityDateHeader, getDateKey, formatMonthShort } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';
import type { Transaction, TransactionType } from '@/types';

type FilterType = 'all' | TransactionType;

export default function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottomTabInset = useBottomTabInset(spacing.lg);
  const userProfile = useAppStore((s) => s.userProfile);
  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Summary totals for chips
  const { totalExpense, totalIncome } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const t of transactions) {
      if (t.type === 'expense') exp += t.amount;
      if (t.type === 'income') inc += t.amount;
    }
    return { totalExpense: exp, totalIncome: inc };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (activeFilter !== 'all' && t.type !== activeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(query);
        const typeMatch = t.type.toLowerCase().includes(query);
        const amountMatch = t.amount.toString().includes(query);
        const category = t.categoryId ? getCategoryById(t.categoryId) : null;
        const categoryMatch = category?.name?.toLowerCase().includes(query);
        return noteMatch || typeMatch || amountMatch || categoryMatch;
      }
      return true;
    });
  }, [transactions, activeFilter, searchQuery, categories, getCategoryById]);

  // Group by date with calculated day badges
  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of filteredTransactions) {
      const key = getDateKey(t.date);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(t);
    }

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const items = groups[key];
        let dayExpense = 0;
        let dayIncome = 0;
        let transferOnly = true;

        for (const item of items) {
          if (item.type === 'expense') {
            dayExpense += item.amount;
            transferOnly = false;
          } else if (item.type === 'income') {
            dayIncome += item.amount;
            transferOnly = false;
          }
        }

        let badgeText = 'Transfer';
        let badgeType: 'expense' | 'income' | 'neutral' = 'neutral';

        if (!transferOnly) {
          if (dayIncome > 0 && dayExpense === 0) {
            badgeText = `+${formatCurrency(dayIncome)}`;
            badgeType = 'income';
          } else if (dayExpense > 0 && dayIncome === 0) {
            badgeText = `-${formatCurrency(dayExpense)}`;
            badgeType = 'expense';
          } else {
            const net = dayIncome - dayExpense;
            badgeText = net >= 0 ? `+${formatCurrency(net)}` : `-${formatCurrency(Math.abs(net))}`;
            badgeType = net >= 0 ? 'income' : 'expense';
          }
        }

        return {
          dateKey: key,
          title: formatActivityDateHeader(items[0].date),
          badgeText,
          badgeType,
          data: items,
        };
      });
  }, [filteredTransactions]);

  const filterChips: Array<{ label: string; value: FilterType }> = [
    { label: 'All', value: 'all' },
    {
      label: `Expenses (-${formatCurrency(totalExpense)})`,
      value: 'expense',
    },
    {
      label: `Income (+${formatCurrency(totalIncome)})`,
      value: 'income',
    },
    { label: 'Transfers', value: 'transfer' },
  ];

  const currentMonthDisplay = formatMonthShort(new Date());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* 1. App Top Header */}
      <View style={styles.header}>
        <View style={styles.logoGroup}>
          <Image
            source={require('@/assets/images/spendz-logo.png')}
            style={styles.logoBadge}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>
              Spendz
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.textTertiary }]}>
              Activity
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Bell size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Avatar name={userProfile.name || 'You'} size={36} />
        </View>
      </View>

      {/* 2. Activity Title & Month Selector Row */}
      <View style={styles.titleRow}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Activity
          </Text>
          <View
            style={[
              styles.countPill,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {filteredTransactions.length} transactions
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.monthChip,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>
            {currentMonthDisplay}
          </Text>
          <TrendingDown size={14} color={colors.income} />
        </TouchableOpacity>
      </View>

      {/* 3. Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          shadows.sm,
        ]}
      >
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          placeholder="Search transactions, notes, categories..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Horizontal Scrollable Filter Chips */}
      <View style={styles.filterScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterIconBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <SlidersHorizontal size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setActiveFilter(chip.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive
                      ? colors.textPrimary
                      : colors.surface,
                    borderColor: isActive ? colors.textPrimary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? colors.surface : colors.textSecondary,
                      fontFamily: isActive
                        ? typography.fontFamily.semiBold
                        : typography.fontFamily.medium,
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. Date-Grouped Transaction List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomTabInset }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          const isExpense = section.badgeType === 'expense';
          const isIncome = section.badgeType === 'income';

          const badgeBg = isExpense
            ? colors.expenseLight
            : isIncome
            ? colors.incomeLight
            : colors.pastelNeutral;

          const badgeTextCol = isExpense
            ? colors.expense
            : isIncome
            ? colors.income
            : colors.pastelNeutralText;

          const dotBg = isIncome
            ? colors.income
            : isExpense
            ? colors.expense
            : colors.textTertiary;

          return (
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionDot, { backgroundColor: dotBg }]} />
                <Text
                  style={[
                    styles.sectionHeaderText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {section.title}
                </Text>
              </View>

              <View style={[styles.dayBadge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.dayBadgeText, { color: badgeTextCol }]}>
                  {section.badgeText}
                </Text>
              </View>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <View
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
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}` as any)}
            />
          </View>
        )}
        ListFooterComponent={
          filteredTransactions.length > 0 ? (
            <View style={styles.footerWrap}>
              <ActivityInsightCard style={styles.insightCardResetMargin} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No transactions found"
            description={
              searchQuery
                ? 'Try adjusting your search query or filters'
                : 'Transactions you add will show up here.'
            }
          />
        }
      />
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
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },
  brandSubtitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.medium,
  },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  monthText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.semiBold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.body,
  },
  filterScrollContainer: {
    marginBottom: spacing.xs,
  },
  filterContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
    paddingVertical: 4,
    alignItems: 'center',
  },
  filterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 2,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 90,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionHeaderText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  dayBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.semiBold,
  },
  itemCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  footerWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  insightCardResetMargin: {
    marginHorizontal: 0,
    marginTop: 0,
  },
});
