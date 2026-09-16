import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  color?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  color,
  variant,
  style,
  size = 'sm',
}) => {
  const { colors } = useTheme();

  const getVariantColor = () => {
    if (color) return color;
    switch (variant) {
      case 'success':
        return colors.income;
      case 'warning':
        return '#F59E0B';
      case 'error':
        return colors.expense;
      default:
        return colors.accent;
    }
  };

  const activeColor = getVariantColor();
  const bgColor = `${activeColor}20`;
  const textColor = activeColor;
  const content = label || children;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          paddingVertical: size === 'sm' ? spacing.xs : spacing.sm,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize:
              size === 'sm' ? typography.fontSize.tiny : typography.fontSize.caption,
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
  },
  text: {
    fontFamily: typography.fontFamily.semiBold,
  },
});
