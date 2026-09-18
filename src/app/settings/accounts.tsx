import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAccountStore } from '@/store/accountStore';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/currency';
import { showAlert } from '@/utils/alert';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

export default function AccountsManagementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const accounts = useAccountStore((s) => s.accounts);
  const deleteAccount = useAccountStore((s) => s.deleteAccount);
  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  const handleDelete = (id: string, name: string) => {
    if (accounts.length <= 1) {
      showAlert(
        'Cannot Delete',
        'You must keep at least one active account for your transactions.'
      );
      return;
    }

    showAlert(
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
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Accounts
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/settings/add-account' as any)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#000000" strokeWidth={2.4} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Total Balance Card */}
        <Card style={styles.totalCard} padding="lg">
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total Balance Across Accounts
          </Text>
          <Text style={[styles.totalAmount, { color: colors.textPrimary }]}>
            {formatCurrency(totalBalance)}
          </Text>
        </Card>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ALL ACCOUNTS ({accounts.length})
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
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                shadows.sm,
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${acc.color}15` },
                ]}
              >
                <DynamicIcon name={acc.icon} size={22} color={acc.color} />
              </View>

              <View style={styles.accountInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.accountName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {acc.name}
                  </Text>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: colors.pastelNeutral },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: colors.pastelNeutralText },
                      ]}
                    >
                      {acc.type.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.accountBalance, { color: colors.textPrimary }]}
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  addBtnText: {
    color: '#000000',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 40,
    gap: spacing.md,
  },
  totalCard: {
    gap: spacing.xs,
  },
  totalLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
  },
  totalAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: -spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  list: {
    gap: spacing.sm,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  accountName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  typeText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  accountBalance: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
});
