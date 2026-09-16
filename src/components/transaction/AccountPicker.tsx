import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { Account } from '@/types';

interface AccountPickerProps {
  accounts: Account[];
  selectedId: string;
  onSelect: (account: Account) => void;
  label?: string;
}

export const AccountPicker: React.FC<AccountPickerProps> = ({
  accounts,
  selectedId,
  onSelect,
  label = 'Account',
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {accounts.map((account) => {
          const isSelected = selectedId === account.id;
          return (
            <TouchableOpacity
              key={account.id}
              onPress={() => onSelect(account)}
              activeOpacity={0.7}
              style={[
                styles.item,
                {
                  backgroundColor: isSelected
                    ? `${account.color}15`
                    : colors.surface,
                  borderColor: isSelected ? account.color : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <DynamicIcon
                name={account.icon}
                size={18}
                color={isSelected ? account.color : colors.textSecondary}
              />
              <View>
                <Text
                  style={[
                    styles.itemName,
                    {
                      color: isSelected
                        ? account.color
                        : colors.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {account.name}
                </Text>
                <Text
                  style={[
                    styles.itemBalance,
                    { color: colors.textTertiary },
                  ]}
                >
                  {formatCurrency(account.balance)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    minWidth: 100,
  },
  itemName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.bodySmall,
  },
  itemBalance: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.tiny,
  },
});
