import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/Input';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useAccountStore } from '@/store/accountStore';
import { ACCOUNT_TYPES, getAccountTypeConfig } from '@/constants/accountTypes';
import { typography } from '@/theme/typography';
import { spacing, borderRadius } from '@/theme/spacing';
import type { AccountType } from '@/types';

export default function AddAccountScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const addAccount = useAccountStore((s) => s.addAccount);

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;

    const config = getAccountTypeConfig(selectedType);
    const parsedBalance = parseFloat(balance) || 0;

    addAccount({
      name: name.trim(),
      type: selectedType,
      balance: parsedBalance,
      icon: config.icon,
      color: config.color,
    });

    router.back();
  };

  const isValid = Boolean(name.trim());

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Add New Account
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Account Name */}
          <Input
            label="Account Name"
            placeholder="e.g., HDFC Bank, Cash Wallet"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          {/* Account Type Selection */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Account Type
            </Text>
          </View>

          <View style={styles.typeGrid}>
            {ACCOUNT_TYPES.map((t) => {
              const isSelected = selectedType === t.type;
              return (
                <TouchableOpacity
                  key={t.type}
                  onPress={() => setSelectedType(t.type)}
                  activeOpacity={0.7}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: isSelected
                        ? colors.accent + '15'
                        : colors.surfaceElevated,
                      borderColor: isSelected
                        ? colors.accent
                        : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typeIconWrap,
                      { backgroundColor: `${t.color}20` },
                    ]}
                  >
                    <DynamicIcon name={t.icon} size={20} color={t.color} />
                  </View>
                  <Text
                    style={[
                      styles.typeLabel,
                      {
                        color: isSelected
                          ? colors.accent
                          : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {t.label}
                  </Text>
                  {isSelected && (
                    <Check
                      size={16}
                      color={colors.accent}
                      strokeWidth={2.5}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Starting Balance */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Starting Balance
            </Text>
          </View>
          <AmountInput value={balance} onChangeText={setBalance} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottom}>
          <Button
            title="Create Account"
            onPress={handleSubmit}
            size="lg"
            fullWidth
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.h3,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeGrid: {
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
  },
  typeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.body,
  },
  checkIcon: {
    marginLeft: spacing.sm,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
});
