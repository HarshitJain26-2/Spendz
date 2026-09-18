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
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { useAccountStore } from '@/store/accountStore';
import { ACCOUNT_TYPES, getAccountTypeConfig } from '@/constants/accountTypes';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
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
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
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
            Add Account
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Card style={styles.formCard} padding="lg">
            {/* Account Name */}
            <Input
              label="Account Name"
              placeholder="e.g., HDFC Bank, Cash Wallet"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            {/* Opening Balance */}
            <Input
              label="Opening Balance (₹)"
              placeholder="0.00"
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
            />
          </Card>

          {/* Account Type Selection */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ACCOUNT TYPE
            </Text>
          </View>

          <Card padding="md" style={styles.typesCard}>
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
                          ? colors.accentLight
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
                            ? colors.textPrimary
                            : colors.textSecondary,
                          fontFamily: isSelected
                            ? typography.fontFamily.semiBold
                            : typography.fontFamily.medium,
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
          </Card>
        </ScrollView>

        <View style={[styles.bottom, { backgroundColor: colors.background }]}>
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
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 40,
    gap: spacing.md,
  },
  formCard: {
    gap: spacing.md,
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
  typesCard: {
    borderRadius: borderRadius.xl,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    flexBasis: '48%',
    flexGrow: 1,
  },
  typeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 13,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
});
