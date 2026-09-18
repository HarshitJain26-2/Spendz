import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Settings } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useBottomTabInset } from '@/hooks/useBottomTabInset';
import { BalanceCard } from '@/components/home/BalanceCard';
import { MonthSummaryCard } from '@/components/home/MonthSummary';
import { RecentTransactions } from '@/components/home/RecentTransactions';
import { Avatar } from '@/components/ui/Avatar';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useSplitStore } from '@/store/splitStore';
import { isCashAccount } from '@/constants/accountTypes';
import { getCurrentMonthRange } from '@/utils/date';
import { getUserPersonalExpense } from '@/utils/calculations';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottomTabInset = useBottomTabInset(spacing.lg);

  const userProfile = useAppStore((s) => s.userProfile);
  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);

  const { totalBalance, cashBalance, onlineBalance } = useMemo(() => {
    let total = 0;
    let cash = 0;
    let online = 0;
    for (const a of accounts) {
      const balance = Number(a.balance) || 0;
      total += balance;
      if (isCashAccount(a.type)) {
        cash += balance;
      } else {
        online += balance;
      }
    }
    return { totalBalance: total, cashBalance: cash, onlineBalance: online };
  }, [accounts]);

  const monthSummary = useMemo(() => {
    const { start, end } = getCurrentMonthRange();
    const monthTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => {
        const split = splitExpenses.find((s) => s.transactionId === t.id);
        return sum + getUserPersonalExpense(t, split);
      }, 0);

    return {
      income,
      expense,
      saved: income - expense,
    };
  }, [transactions, splitExpenses]);

  const recentTransactions = useMemo(
    () => transactions.slice(0, 5),
    [transactions]
  );

  const greeting = userProfile.name
    ? `Hey, ${userProfile.name} 👋`
    : 'Hey there 👋';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      {/* Brand Header */}
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
              Overview
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/settings')}
            style={[
              styles.iconButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <Settings size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Avatar name={userProfile.name || 'You'} size={36} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomTabInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting / Page Title */}
        <Animated.View entering={FadeIn.delay(50).duration(400)}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            {greeting}
          </Text>
        </Animated.View>

        {/* Balance Card */}
        <BalanceCard
          totalBalance={totalBalance}
          cashBalance={cashBalance}
          onlineBalance={onlineBalance}
        />

        {/* Month Summary */}
        <MonthSummaryCard
          summary={monthSummary}
          onPress={() => router.push('/insights')}
        />

        {/* Recent Transactions */}
        <RecentTransactions
          transactions={recentTransactions}
          onViewAll={() => router.push('/(tabs)/activity')}
          onTransactionPress={(t) => router.push(`/transaction/${t.id}`)}
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
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
});
