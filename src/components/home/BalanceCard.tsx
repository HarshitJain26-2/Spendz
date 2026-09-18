import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Wallet, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface BalanceCardProps {
  totalBalance: number;
  cashBalance: number;
  onlineBalance: number;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  totalBalance,
  cashBalance,
  onlineBalance,
}) => {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.delay(200).duration(500)}>
      <Card style={styles.card} padding="lg">
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Total Balance
        </Text>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          {formatCurrency(totalBalance)}
        </Text>

        <View style={styles.breakdown}>
          {/* Cash */}
          <View
            style={[
              styles.breakdownItem,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.breakdownIcon,
                { backgroundColor: colors.incomeLight },
              ]}
            >
              <Wallet size={18} color={colors.income} strokeWidth={2} />
            </View>
            <View style={styles.breakdownTextWrap}>
              <Text
                style={[styles.breakdownLabel, { color: colors.textSecondary }]}
              >
                Cash
              </Text>
              <Text
                style={[
                  styles.breakdownAmount,
                  { color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {formatCurrency(cashBalance)}
              </Text>
            </View>
          </View>

          {/* Online */}
          <View
            style={[
              styles.breakdownItem,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.breakdownIcon,
                { backgroundColor: colors.transferLight },
              ]}
            >
              <Smartphone size={18} color={colors.transfer} strokeWidth={2} />
            </View>
            <View style={styles.breakdownTextWrap}>
              <Text
                style={[styles.breakdownLabel, { color: colors.textSecondary }]}
              >
                Online
              </Text>
              <Text
                style={[
                  styles.breakdownAmount,
                  { color: colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {formatCurrency(onlineBalance)}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
    marginBottom: spacing.xs,
  },
  amount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.hero,
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  breakdown: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  breakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  breakdownIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownTextWrap: {
    flex: 1,
  },
  breakdownLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
    marginBottom: 2,
  },
  breakdownAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
});
