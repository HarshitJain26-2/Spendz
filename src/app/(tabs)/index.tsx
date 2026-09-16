import React from 'react';
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
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const userProfile = useAppStore((s) => s.userProfile);
  const totalBalance = useAccountStore((s) => s.getTotalBalance());
  const cashBalance = useAccountStore((s) => s.getCashBalance());
  const onlineBalance = useAccountStore((s) => s.getOnlineBalance());
  const monthSummary = useTransactionStore((s) => s.getCurrentMonthSummary());
  const recentTransactions = useTransactionStore((s) =>
    s.getRecentTransactions(5)
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
