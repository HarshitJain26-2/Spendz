import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionTitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  actionLabel,
  onAction,
  style,
}) => {
  const { colors } = useTheme();
  const btnTitle = actionTitle || actionLabel;

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: colors.accentLight }]}>
          {icon}
        </View>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {btnTitle && onAction && (
        <Button
          title={btnTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.bodySmall,
    textAlign: 'center',
    lineHeight: typography.lineHeight.bodySmall,
    maxWidth: 280,
  },
  button: {
    marginTop: spacing.xl,
  },
});
