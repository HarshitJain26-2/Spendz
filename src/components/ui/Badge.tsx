import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'expense'
  | 'income'
  | 'transfer'
  | 'neutral';

interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  color?: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  color,
  variant = 'default',
  style,
  size = 'sm',
}) => {
  const { colors } = useTheme();

  const getBadgeColors = (): { bg: string; text: string } => {
    if (color) {
      return { bg: `${color}18`, text: color };
    }

    switch (variant) {
      case 'expense':
      case 'error':
        return { bg: colors.expenseLight, text: colors.expense };
      case 'income':
      case 'success':
        return { bg: colors.incomeLight, text: colors.income };
      case 'transfer':
        return { bg: colors.transferLight, text: colors.transfer };
      case 'neutral':
        return { bg: colors.pastelNeutral, text: colors.pastelNeutralText };
      case 'warning':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'default':
      default:
        return { bg: colors.surfaceElevated, text: colors.textSecondary };
    }
  };

  const { bg, text } = getBadgeColors();
  const content = label || children;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontSize: size === 'sm' ? 11 : 12,
            fontFamily: typography.fontFamily.semiBold,
          },
        ]}
        numberOfLines={1}
      >
        {content}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    letterSpacing: 0.2,
  },
});
