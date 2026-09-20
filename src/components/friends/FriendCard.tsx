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
  balance: number; // positive = owes you, negative = you owe, 0 = settled
  onPress: () => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  balance,
  onPress,
}) => {
  const { colors } = useTheme();

  const getBalanceDisplay = () => {
    if (balance > 0) {
      return {
        text: `Owes you ${formatCurrency(balance)}`,
        textColor: colors.income,
      };
    }
    if (balance < 0) {
      return {
        text: `You owe ${formatCurrency(Math.abs(balance))}`,
        textColor: colors.expense,
      };
    }
    return {
      text: 'Settled',
      textColor: colors.textTertiary,
    };
  };

  const balanceInfo = getBalanceDisplay();

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
      <Avatar name={friend.name} color={friend.avatarColor} size={44} />

      <View style={styles.info}>
        <Text
          style={[styles.name, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {friend.name}
        </Text>
        <Text
          style={[
            styles.status,
            {
              color: balanceInfo.textColor,
            },
          ]}
          numberOfLines={1}
        >
          {balanceInfo.text}
        </Text>
      </View>

      <ChevronRight size={18} color={colors.textTertiary} />
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
    justifyContent: 'center',
  },
  name: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 3,
  },
  status: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    lineHeight: 17,
  },
});
