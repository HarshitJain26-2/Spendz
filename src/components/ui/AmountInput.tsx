import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  placeholder = '0',
  style,
  autoFocus = true,
}) => {
  const { colors } = useTheme();

  const handleChange = useCallback(
    (text: string) => {
      // Allow only numbers and one decimal point
      const cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) return;
      if (parts[1] && parts[1].length > 2) return;
      onChangeText(cleaned);
    },
    [onChangeText]
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.currency, { color: colors.textTertiary }]}>₹</Text>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        autoFocus={autoFocus}
        style={[styles.input, { color: colors.textPrimary }]}
        maxLength={12}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  currency: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h1,
    marginRight: spacing.sm,
  },
  input: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.hero,
    minWidth: 100,
    textAlign: 'center',
  },
});
