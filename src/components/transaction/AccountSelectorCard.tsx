import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { Landmark, ChevronsUpDown, Check, Wallet, Smartphone, CreditCard } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { borderRadius, spacing } from '@/theme/spacing';
import type { Account } from '@/types';

interface AccountSelectorCardProps {
  accounts: Account[];
  selectedId: string;
  onSelect: (account: Account) => void;
  onOpen?: () => void;
  label?: string;
  style?: ViewStyle;
}

export const AccountSelectorCard: React.FC<AccountSelectorCardProps> = ({
  accounts,
  selectedId,
  onSelect,
  onOpen,
  label = 'PAID FROM',
  style,
}) => {
  const { colors } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === selectedId) || accounts[0];

  const getAccountIcon = (type?: string) => {
    switch (type) {
      case 'cash':
        return <Wallet size={20} color={colors.accent} strokeWidth={2} />;
      case 'bank':
        return <Landmark size={20} color="#3B82F6" strokeWidth={2} />;
      case 'credit_card':
        return <CreditCard size={20} color="#8B5CF6" strokeWidth={2} />;
      default:
        return <Smartphone size={20} color="#10B981" strokeWidth={2} />;
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          onOpen?.();
          setSheetVisible(true);
        }}
        activeOpacity={0.7}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: colors.surfaceElevated },
          ]}
        >
          {getAccountIcon(selectedAccount?.type)}
        </View>

        <View style={styles.info}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <View style={styles.nameRow}>
            <Text
              style={[styles.value, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {selectedAccount?.name || 'Select Account'}
            </Text>
            {selectedAccount && (
              <Text style={[styles.balanceText, { color: colors.accent }]}>
                {formatCurrency(selectedAccount.balance)} avail.
              </Text>
            )}
          </View>
        </View>

        <ChevronsUpDown size={18} color={colors.textTertiary} strokeWidth={2} />
      </TouchableOpacity>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        height={420}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Select Account
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScroll}
        >
          {accounts.map((account) => {
            const isSelected = selectedAccount?.id === account.id;

            return (
              <TouchableOpacity
                key={account.id}
                onPress={() => {
                  onSelect(account);
                  setSheetVisible(false);
                }}
                activeOpacity={0.7}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor: isSelected
                      ? colors.surfaceElevated
                      : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  {getAccountIcon(account.type)}
                </View>

                <View style={styles.optionInfo}>
                  <Text
                    style={[
                      styles.optionName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {account.name}
                  </Text>
                  <Text
                    style={[
                      styles.optionBalance,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatCurrency(account.balance)} available
                  </Text>
                </View>

                {isSelected && (
                  <Check size={18} color={colors.accent} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.semiBold,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  value: {
    fontSize: 16,
    fontFamily: typography.fontFamily.semiBold,
  },
  balanceText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
  },
  sheetHeader: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECE6',
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
  },
  sheetScroll: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
  },
  optionBalance: {
    fontSize: 12,
    fontFamily: typography.fontFamily.regular,
    marginTop: 2,
  },
});
