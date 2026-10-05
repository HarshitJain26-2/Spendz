import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { Group } from '@/types';

interface GroupCardProps {
  group: Group;
  balance: number; // positive = you are owed, negative = you owe, 0 = settled
  memberCount: number;
  onPress: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  balance,
  memberCount,
  onPress,
}) => {
  const { colors } = useTheme();

  const getBalanceDisplay = () => {
    if (balance > 0) {
      return {
        text: `You are owed ${formatCurrency(balance)}`,
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
      {/* Group Icon Circle */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.accentLight,
          },
        ]}
      >
        <Text style={styles.iconText}>{group.icon || '🏖'}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.memberCount, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Text>
          <Text style={[styles.dot, { color: colors.textTertiary }]}>•</Text>
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
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
  },
  dot: {
    fontSize: 12,
  },
  status: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    lineHeight: 17,
  },
});
