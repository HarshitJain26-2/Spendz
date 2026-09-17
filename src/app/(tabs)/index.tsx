import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { BalanceCard } from '@/components/home/BalanceCard';
import { MonthSummaryCard } from '@/components/home/MonthSummary';
import { RecentTransactions } from '@/components/home/RecentTransactions';
import { FAB } from '@/components/ui/FAB';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useTransactionStore } from '@/store/transactionStore';
import { isOnlineAccount } from '@/constants/accountTypes';
import { getCurrentMonthRange } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const userProfile = useAppStore((s) => s.userProfile);
  const accounts = useAccountStore((s) => s.accounts);
  const transactions = useTransactionStore((s) => s.transactions);

  const { totalBalance, cashBalance, onlineBalance } = useMemo(() => {
    let total = 0;
    let cash = 0;
    let online = 0;
    for (const a of accounts) {
      total += a.balance;
      if (a.type === 'cash') {
        cash += a.balance;
      }
      if (isOnlineAccount(a.type)) {
        online += a.balance;
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
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      saved: income - expense,
    };
  }, [transactions]);

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
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Animated.View entering={FadeIn.delay(100).duration(500)}>
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
          onTransactionPress={(t) =>
            router.push(`/transaction/${t.id}`)
          }
        />
      </ScrollView>

      {/* Floating Add Button */}
      <FAB
        icon={<Plus size={28} color="#FFFFFF" strokeWidth={2.5} />}
        onPress={() => router.push('/add')}
        style={styles.fab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['6xl'],
  },
  greeting: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h2,
    marginBottom: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
  },
});
