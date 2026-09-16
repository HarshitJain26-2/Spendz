import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAccountStore } from '@/store/accountStore';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/utils/currency';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';

export default function AccountsManagementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const accounts = useAccountStore((s) => s.accounts);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);
  const totalBalance = useAccountStore((s) => s.getTotalBalance());

  const handleDelete = (id: string, name: string) => {
    if (accounts.length <= 1) {
      Alert.alert(
        'Cannot Delete',
        'You must keep at least one active account for your transactions.'
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAccount(id),
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Accounts
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/settings/add-account' as any)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Balance Card */}
        <View
          style={[
            styles.totalCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total Balance Across Accounts
          </Text>
          <Text style={[styles.totalAmount, { color: colors.textPrimary }]}>
            {formatCurrency(totalBalance)}
          </Text>
        </View>

        {/* Account Cards */}
        <View style={styles.list}>
          {accounts.map((acc) => (
            <View
              key={acc.id}
              style={[
                styles.accountCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${acc.color}20` },
                ]}
              >
                <DynamicIcon name={acc.icon} size={22} color={acc.color} />
              </View>

              <View style={styles.accountInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.accountName, { color: colors.textPrimary }]}
                  >
                    {acc.name}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[styles.typeText, { color: colors.textSecondary }]}
                    >
                      {acc.type.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.accountBalance, { color: colors.accent }]}
                >
                  {formatCurrency(acc.balance)}
                </Text>
              </View>

              {accounts.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleDelete(acc.id, acc.name)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={18} color={colors.expense} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.small,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  totalCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.hero,
  },
  list: {
    gap: spacing.sm,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: typography.fontSize.body,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.tiny,
  },
  accountBalance: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.body,
  },
  deleteBtn: {
    padding: 6,
  },
});
