import React from 'react';
import { View, TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { borderRadius as themeRadii, spacing, shadows } from '@/theme/spacing';

export type CardVariant = 'standard' | 'flat' | 'elevated' | 'outline';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardRadius = 'md' | 'lg' | 'xl' | '2xl';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
  elevated?: boolean;
  noPadding?: boolean;
  padding?: CardPadding;
  radius?: CardRadius;
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'standard',
  elevated = false,
  noPadding = false,
  padding,
  radius = 'xl',
  onPress,
  activeOpacity = 0.7,
}) => {
  const { colors } = useTheme();

  // Resolve active variant
  const effectiveVariant: CardVariant = elevated ? 'elevated' : variant;

  const getBackgroundColor = () => {
    switch (effectiveVariant) {
      case 'flat':
        return colors.surfaceElevated;
      case 'standard':
      case 'elevated':
      case 'outline':
      default:
        return colors.surface;
    }
  };

  const getShadowStyle = () => {
    switch (effectiveVariant) {
      case 'elevated':
        return shadows.md;
      case 'standard':
        return shadows.sm;
      case 'flat':
      case 'outline':
      default:
        return null;
    }
  };

  const getPaddingStyle = () => {
    if (noPadding) return 0;
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'md':
        return spacing.md;
      case 'xl':
        return spacing.xl;
      case 'lg':
      default:
        return spacing.lg;
    }
  };

  const getRadiusStyle = () => {
    switch (radius) {
      case 'md':
        return themeRadii.md;
      case 'lg':
        return themeRadii.lg;
      case '2xl':
        return themeRadii['2xl'];
      case 'xl':
      default:
        return themeRadii.xl;
    }
  };

  const cardStyle: ViewStyle[] = [
    styles.cardBase,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: colors.border,
      borderRadius: getRadiusStyle(),
      padding: getPaddingStyle(),
    },
    getShadowStyle() as ViewStyle,
    style as ViewStyle,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={activeOpacity}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  cardBase: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
