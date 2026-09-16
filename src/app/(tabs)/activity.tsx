import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTransactionStore } from '@/store/transactionStore';
import { TransactionItem } from '@/components/transaction/TransactionItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateHeader, getDateKey } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { Transaction, TransactionType } from '@/types';

type FilterType = 'all' | TransactionType;

export default function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const transactions = useTransactionStore((s) => s.transactions);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
        return noteMatch || typeMatch || amountMatch;
      }
      return true;
    });
  }, [transactions, activeFilter, searchQuery]);

  // Group by date
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
      .map((key) => ({
        dateKey: key,
        title: formatDateHeader(groups[key][0].date),
        data: groups[key],
      }));
  }, [filteredTransactions]);

  const filterOptions: Array<{ label: string; value: FilterType }> = [
    { label: 'All', value: 'all' },
    { label: 'Expenses', value: 'expense' },
    { label: 'Income', value: 'income' },
    { label: 'Transfers', value: 'transfer' },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Activity
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          placeholder="Search transactions, notes..."
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

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        {filterOptions.map((opt) => {
          const isActive = activeFilter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setActiveFilter(opt.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive
                    ? colors.accent
                    : colors.surfaceElevated,
                  borderColor: isActive ? colors.accent : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isActive ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Transaction List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title } }) => (
          <View
            style={[
              styles.sectionHeaderWrap,
              { backgroundColor: colors.background },
            ]}
          >
            <Text
              style={[
                styles.sectionHeaderTitle,
                { color: colors.textSecondary },
              ]}
            >
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View
            style={[
              styles.itemWrap,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <TransactionItem
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}` as any)}
            />
          </View>
        )}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.body,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.fontSize.caption,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  sectionHeaderWrap: {
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemWrap: {
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
});
