import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
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
        text: `Owes you ${formatCurrency(balance)}`,
        amount: `+${formatCurrency(balance)}`,
        color: colors.income,
      };
    } else if (balance < 0) {
      return {
        text: `You owe ${formatCurrency(Math.abs(balance))}`,
        amount: `-${formatCurrency(Math.abs(balance))}`,
        color: colors.expense,
      };
    } else {
      return {
        text: 'All settled up',
        amount: 'Settled',
        color: colors.textTertiary,
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
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
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
        <Text style={[styles.status, { color: info.color }]} numberOfLines={1}>
          {info.text}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: info.color }]}>
          {info.amount}
        </Text>
        <ChevronRight size={18} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
    marginBottom: 2,
  },
  status: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.caption,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
});
