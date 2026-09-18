import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { Friend } from '@/types';

interface FriendCardProps {
  friend: Friend;
  balance: number; // positive = owes you, negative = you owe
  onPress: () => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  balance,
  onPress,
}) => {
  const { colors } = useTheme();

  const getBalanceInfo = () => {
    if (balance > 0) {
      return {
        text: `${friend.name} owes you`,
        amount: `+${formatCurrency(balance)}`,
        badgeBg: colors.incomeLight,
        badgeText: colors.income,
      };
    } else if (balance < 0) {
      return {
        text: `You owe ${friend.name}`,
        amount: `-${formatCurrency(Math.abs(balance))}`,
        badgeBg: colors.expenseLight,
        badgeText: colors.expense,
      };
    } else {
      return {
        text: 'All settled up',
        amount: 'Settled',
        badgeBg: colors.pastelNeutral,
        badgeText: colors.pastelNeutralText,
      };
    }
  };

  const info = getBalanceInfo();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        shadows.sm,
      ]}
    >
      <Avatar name={friend.name} size={44} />

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {friend.name}
        </Text>
        <Text
          style={[styles.status, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {info.text}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={[styles.pillBadge, { backgroundColor: info.badgeBg }]}>
          <Text style={[styles.pillText, { color: info.badgeText }]}>
            {info.amount}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  status: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  pillText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.semiBold,
  },
});
