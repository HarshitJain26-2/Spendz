import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  Wallet,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { getCategoryEmoji } from '@/components/transaction/CategorySelectorCard';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/utils/currency';
import { getUserPersonalExpense } from '@/utils/calculations';
import { exportReportToPdf, type ReportData } from '@/utils/reportPdf';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import { showAlert } from '@/utils/alert';

type PeriodType = 'weekly' | 'monthly' | 'custom';

export default function ReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const transactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const friends = useFriendStore((s) => s.friends);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const getFriendBalance = useSplitStore((s) => s.getFriendBalance);
  const userProfile = useAppStore((s) => s.userProfile);

  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [isExporting, setIsExporting] = useState(false);

  // Month navigation: offset in months from current month (0 = current)
  const [monthOffset, setMonthOffset] = useState(0);

  // Week navigation: offset in weeks from current week (0 = current)
  const [weekOffset, setWeekOffset] = useState(0);

  // Custom date strings (YYYY-MM-DD)
  const todayISO = new Date().toISOString().split('T')[0];
  const firstOfMonthISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [customStartDate, setCustomStartDate] = useState(firstOfMonthISO);
  const [customEndDate, setCustomEndDate] = useState(todayISO);

  // Calculate Date Range
  const { start, end, label } = useMemo(() => {
    const now = new Date();

    if (periodType === 'monthly') {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const label = `${months[start.getMonth()]} ${start.getFullYear()}`;

      return { start, end, label };
    }

    if (periodType === 'weekly') {
      const d = new Date(now);
      // Move by weekOffset weeks
      d.setDate(d.getDate() + weekOffset * 7);

      // Find Monday of this week
      const day = d.getDay(); // 0 is Sunday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(d);
      start.setDate(d.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const monthsShort = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const label = `${start.getDate()} ${monthsShort[start.getMonth()]} – ${end.getDate()} ${monthsShort[end.getMonth()]} ${end.getFullYear()}`;

      return { start, end, label };
    }

    // Custom date range: inclusive end date
    const startParts = customStartDate.split('-').map(Number);
    const endParts = customEndDate.split('-').map(Number);

    const start = new Date(startParts[0], (startParts[1] || 1) - 1, startParts[2] || 1, 0, 0, 0, 0);
    const end = new Date(endParts[0], (endParts[1] || 1) - 1, endParts[2] || 1, 23, 59, 59, 999);

    const label = `${customStartDate} to ${customEndDate}`;

    return { start, end, label };
  }, [periodType, monthOffset, weekOffset, customStartDate, customEndDate]);

  // Validation
  const isCustomRangeValid = useMemo(() => {
    if (periodType !== 'custom') return true;
    return start.getTime() <= end.getTime();
  }, [periodType, start, end]);

  // Period Transactions (read-only filtering)
  const filteredTransactions = useMemo(() => {
    if (!isCustomRangeValid) return [];

    return transactions.filter((t) => {
      const txTime = new Date(t.date).getTime();
      return txTime >= start.getTime() && txTime <= end.getTime();
    });
  }, [transactions, start, end, isCustomRangeValid]);

  // Period Financial Calculations
  const {
    periodIncome,
    periodExpense,
    periodNet,
    categoryBreakdown,
    topCategory,
  } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categoryTotals: Record<string, { amount: number; count: number }> = {};

    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        const split = splitExpenses.find((s) => s.transactionId === t.id);
        const userExpense = getUserPersonalExpense(t, split);
        expense += userExpense;

        const catId = t.categoryId || 'other';
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = { amount: 0, count: 0 };
        }
        categoryTotals[catId].amount += userExpense;
        categoryTotals[catId].count += 1;
      }
      // Transfers and settlements do not count as income or expense
    }

    const totalExpense = expense;
    const breakdown = Object.entries(categoryTotals)
      .map(([catId, data]) => {
        const cat = categories.find((c) => c.id === catId);
        const name = cat ? cat.name : 'Other';
        const percentage = totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0;
        return {
          id: catId,
          name,
          amount: data.amount,
          percentage,
          count: data.count,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      periodIncome: income,
      periodExpense: expense,
      periodNet: income - expense,
      categoryBreakdown: breakdown,
      topCategory: breakdown.length > 0 ? breakdown[0] : null,
    };
  }, [filteredTransactions, splitExpenses, categories]);

  // Current Balances Snapshot (As of Today)
  const currentAccountsSnapshot = useMemo(() => {
    return accounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
    }));
  }, [accounts]);

  const totalCurrentBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  const currentFriendBalancesSnapshot = useMemo(() => {
    return friends
      .map((f) => ({
        friendName: f.name,
        balance: getFriendBalance(f.id),
      }))
      .filter((f) => f.balance !== 0);
  }, [friends, getFriendBalance]);

  // Handle Export PDF
  const handleExportPdf = async () => {
    if (!isCustomRangeValid) {
      showAlert('Invalid Date Range', 'Start date must be before or equal to End date.');
      return;
    }

    setIsExporting(true);
    try {
      const reportData: ReportData = {
        title: 'SPENDZ Financial Report',
        periodLabel: label,
        startDateStr: start.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        endDateStr: end.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        generatedAtStr: new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        currency: '₹',
        userName: userProfile.name || '',
        periodIncome,
        periodExpense,
        periodNet,
        transactionCount: filteredTransactions.length,
        categoryBreakdown,
        currentAccounts: currentAccountsSnapshot,
        totalCurrentBalance,
        currentFriendBalances: currentFriendBalancesSnapshot,
        transactions: filteredTransactions.map((t) => {
          const cat = categories.find((c) => c.id === t.categoryId);
          const acc = accounts.find((a) => a.id === t.accountId);
          return {
            id: t.id,
            date: t.date,
            type: t.type,
            note: t.note,
            categoryName: cat ? cat.name : 'Uncategorized',
            accountName: acc ? acc.name : 'Unknown Account',
            amount: t.amount,
          };
        }),
      };

      await exportReportToPdf(reportData);
    } catch (e: any) {
      showAlert('Export Failed', e?.message || 'Failed to generate PDF report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <PageHeader
        title="Reports & Export"
        showBackButton
        onBack={() => router.back()}
        style={styles.header}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Period Selector Tabs */}
        <View style={[styles.periodTabs, { backgroundColor: colors.surfaceElevated }]}>
          {(['weekly', 'monthly', 'custom'] as PeriodType[]).map((type) => {
            const isSelected = periodType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setPeriodType(type)}
                style={[
                  styles.tabButton,
                  isSelected && {
                    backgroundColor: colors.surface,
                    ...shadows.sm,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isSelected ? colors.textPrimary : colors.textTertiary,
                      fontFamily: isSelected
                        ? typography.fontFamily.bold
                        : typography.fontFamily.medium,
                    },
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Period Navigation / Date Controls */}
        <Card padding="md" style={styles.dateNavCard}>
          {periodType === 'weekly' && (
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => setWeekOffset((prev) => prev - 1)}
                style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.navLabelWrap}>
                <Calendar size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.navLabelText, { color: colors.textPrimary }]}>
                  {label}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setWeekOffset((prev) => prev + 1)}
                style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}
                activeOpacity={0.7}
              >
                <ChevronRight size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {periodType === 'monthly' && (
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => setMonthOffset((prev) => prev - 1)}
                style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.navLabelWrap}>
                <Calendar size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.navLabelText, { color: colors.textPrimary }]}>
                  {label}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setMonthOffset((prev) => prev + 1)}
                style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}
                activeOpacity={0.7}
              >
                <ChevronRight size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {periodType === 'custom' && (
            <View style={styles.customDateContainer}>
              <View style={styles.customInputsRow}>
                <View style={styles.customInputWrap}>
                  <Text style={[styles.customLabel, { color: colors.textTertiary }]}>
                    START DATE (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    value={customStartDate}
                    onChangeText={setCustomStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    style={[
                      styles.customInput,
                      {
                        color: colors.textPrimary,
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>

                <View style={styles.customInputWrap}>
                  <Text style={[styles.customLabel, { color: colors.textTertiary }]}>
                    END DATE (INCLUSIVE)
                  </Text>
                  <TextInput
                    value={customEndDate}
                    onChangeText={setCustomEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textTertiary}
                    style={[
                      styles.customInput,
                      {
                        color: colors.textPrimary,
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                </View>
              </View>

              {!isCustomRangeValid && (
                <View style={styles.errorNotice}>
                  <AlertCircle size={14} color={colors.expense} style={{ marginRight: 6 }} />
                  <Text style={[styles.errorNoticeText, { color: colors.expense }]}>
                    Start date must be before or equal to end date.
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* 3. Period Performance Summary */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PERIOD PERFORMANCE ({label.toUpperCase()})
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          {/* Income */}
          <Card padding="md" style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <View style={[styles.metricIconBox, { backgroundColor: colors.incomeLight }]}>
                <TrendingUp size={16} color={colors.income} strokeWidth={2.5} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Income
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.income }]}>
              {formatCurrency(periodIncome)}
            </Text>
          </Card>

          {/* Spent */}
          <Card padding="md" style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <View style={[styles.metricIconBox, { backgroundColor: colors.expenseLight }]}>
                <TrendingDown size={16} color={colors.expense} strokeWidth={2.5} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Spent
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.expense }]}>
              {formatCurrency(periodExpense)}
            </Text>
          </Card>

          {/* Net / Saved */}
          <Card padding="md" style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <View
                style={[
                  styles.metricIconBox,
                  {
                    backgroundColor:
                      periodNet >= 0 ? colors.incomeLight : colors.expenseLight,
                  },
                ]}
              >
                <Scale
                  size={16}
                  color={periodNet >= 0 ? colors.income : colors.expense}
                  strokeWidth={2.5}
                />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Net Saved
              </Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                { color: periodNet >= 0 ? colors.income : colors.expense },
              ]}
            >
              {formatCurrency(periodNet)}
            </Text>
          </Card>

          {/* Transactions Count */}
          <Card padding="md" style={styles.metricCard}>
            <View style={styles.metricIconRow}>
              <View style={[styles.metricIconBox, { backgroundColor: colors.accentLight }]}>
                <Receipt size={16} color={colors.accent} strokeWidth={2.5} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Entries
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {filteredTransactions.length}
            </Text>
          </Card>
        </View>

        {/* Top Category Badge */}
        {topCategory && (
          <Card padding="sm" style={styles.topCategoryCard}>
            <View style={styles.topCategoryRow}>
              <Text style={styles.topCatEmoji}>
                {getCategoryEmoji(topCategory.id, topCategory.name)}
              </Text>
              <View style={styles.topCatInfo}>
                <Text style={[styles.topCatTitle, { color: colors.textPrimary }]}>
                  Top Category: {topCategory.name}
                </Text>
                <Text style={[styles.topCatSub, { color: colors.textTertiary }]}>
                  {formatCurrency(topCategory.amount)} ({topCategory.percentage.toFixed(1)}% of spending)
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* 4. Spending by Category */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SPENDING BY CATEGORY
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map((cat, index) => {
              const emoji = getCategoryEmoji(cat.id, cat.name);
              return (
                <View key={cat.id}>
                  <View style={styles.catRow}>
                    <Text style={styles.catEmoji}>{emoji}</Text>
                    <View style={styles.catMiddle}>
                      <View style={styles.catTitleRow}>
                        <Text style={[styles.catName, { color: colors.textPrimary }]}>
                          {cat.name}
                        </Text>
                        <Text style={[styles.catAmount, { color: colors.textPrimary }]}>
                          {formatCurrency(cat.amount)}
                        </Text>
                      </View>
                      {/* Share progress bar */}
                      <View style={[styles.barBg, { backgroundColor: colors.surfaceElevated }]}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.min(cat.percentage, 100)}%`,
                              backgroundColor: colors.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.catShareText, { color: colors.textTertiary }]}>
                        {cat.count} txns · {cat.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  {index < categoryBreakdown.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCardBox}>
              <Text style={[styles.emptyCardText, { color: colors.textTertiary }]}>
                No spending recorded for this period.
              </Text>
            </View>
          )}
        </Card>

        {/* 5. Current Snapshot: Accounts & Friend Balances */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CURRENT SNAPSHOT (AS OF TODAY)
          </Text>
        </View>

        <Card padding="none" style={styles.groupedCard}>
          <View style={styles.snapshotHeader}>
            <View style={styles.snapshotHeaderLeft}>
              <Wallet size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.snapshotTitle, { color: colors.textPrimary }]}>
                Accounts Balance
              </Text>
            </View>
            <Text style={[styles.snapshotTotal, { color: colors.textPrimary }]}>
              {formatCurrency(totalCurrentBalance)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {currentAccountsSnapshot.map((acc, index) => (
            <View key={acc.name}>
              <View style={styles.snapshotRow}>
                <Text style={[styles.snapshotItemName, { color: colors.textPrimary }]}>
                  {acc.name}{' '}
                  <Text style={[styles.snapshotItemType, { color: colors.textTertiary }]}>
                    ({acc.type})
                  </Text>
                </Text>
                <Text
                  style={[
                    styles.snapshotItemAmount,
                    {
                      color: acc.balance >= 0 ? colors.textPrimary : colors.expense,
                    },
                  ]}
                >
                  {formatCurrency(acc.balance)}
                </Text>
              </View>
              {index < currentAccountsSnapshot.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </Card>

        {/* Friend Balances Snapshot */}
        <Card padding="none" style={{ ...styles.groupedCard, marginTop: spacing.md }}>
          <View style={styles.snapshotHeader}>
            <View style={styles.snapshotHeaderLeft}>
              <Users size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.snapshotTitle, { color: colors.textPrimary }]}>
                Friend Debts (Current)
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {currentFriendBalancesSnapshot.length > 0 ? (
            currentFriendBalancesSnapshot.map((f, index) => {
              const owesYou = f.balance > 0;
              const statusColor = owesYou ? colors.income : colors.expense;
              const statusLabel = owesYou ? 'owes you' : 'you owe';
              return (
                <View key={f.friendName}>
                  <View style={styles.snapshotRow}>
                    <Text style={[styles.snapshotItemName, { color: colors.textPrimary }]}>
                      {f.friendName}
                    </Text>
                    <Text style={[styles.snapshotItemAmount, { color: statusColor }]}>
                      {statusLabel} {formatCurrency(Math.abs(f.balance))}
                    </Text>
                  </View>
                  {index < currentFriendBalancesSnapshot.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCardBox}>
              <Text style={[styles.emptyCardText, { color: colors.textTertiary }]}>
                No pending debts with friends.
              </Text>
            </View>
          )}
        </Card>

        {/* 6. Export Action */}
        <View style={styles.exportCtaWrap}>
          <Button
            title={isExporting ? 'Generating Report...' : 'Export PDF Report'}
            onPress={handleExportPdf}
            disabled={isExporting || !isCustomRangeValid}
            size="lg"
            fullWidth
            icon={
              isExporting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Share2 size={20} color="#000000" strokeWidth={2.4} />
              )
            }
          />
          <Text style={[styles.exportNoticeText, { color: colors.textTertiary }]}>
            PDF is generated locally on your device with complete transaction breakdown.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  periodTabs: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  tabText: {
    fontSize: 13,
  },
  dateNavCard: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLabelText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  customDateContainer: {
    gap: spacing.sm,
  },
  customInputsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  customInputWrap: {
    flex: 1,
  },
  customLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    fontFamily: typography.fontFamily.medium,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  errorNoticeText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: borderRadius.lg,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metricIconBox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
  },
  metricValue: {
    fontSize: 17,
    fontFamily: typography.fontFamily.bold,
  },
  topCategoryCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  topCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topCatEmoji: {
    fontSize: 22,
  },
  topCatInfo: {
    flex: 1,
  },
  topCatTitle: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  topCatSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
  },
  groupedCard: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  catEmoji: {
    fontSize: 20,
  },
  catMiddle: {
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  catAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  barBg: {
    height: 5,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  catShareText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  snapshotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snapshotTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  snapshotTotal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  snapshotItemName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.medium,
  },
  snapshotItemType: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  snapshotItemAmount: {
    fontSize: 13,
    fontFamily: typography.fontFamily.semiBold,
  },
  emptyCardBox: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.regular,
  },
  divider: {
    height: 1,
  },
  exportCtaWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  exportNoticeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
});
