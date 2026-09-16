import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { AmountInput } from '@/components/ui/AmountInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AccountPicker } from '@/components/transaction/AccountPicker';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountStore } from '@/store/accountStore';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function AddTransferScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const accounts = useAccountStore((s) => s.accounts);

  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(
    accounts.length > 1 ? accounts[1]?.id : ''
  );
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!fromAccountId || !toAccountId) return;

    if (fromAccountId === toAccountId) {
      Alert.alert(
        'Invalid Transfer',
        'Source and destination accounts must be different.'
      );
      return;
    }

    addTransaction({
      type: 'transfer',
      amount: parsedAmount,
      categoryId: null,
      accountId: fromAccountId,
      toAccountId: toAccountId,
      note: note.trim() || 'Account Transfer',
      date: getTodayISO(),
    });

    router.dismiss();
  };

  const isValid =
    parseFloat(amount) > 0 &&
    Boolean(fromAccountId) &&
    Boolean(toAccountId) &&
    fromAccountId !== toAccountId;

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
          <Text style={[styles.title, { color: colors.transfer }]}>
            Transfer Money
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <AmountInput value={amount} onChangeText={setAmount} />

          {/* From Account */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              From Account
            </Text>
          </View>
          <AccountPicker
            accounts={accounts}
            selectedId={fromAccountId}
            onSelect={(a) => setFromAccountId(a.id)}
          />

          {/* Transfer icon divider */}
          <View style={styles.indicatorContainer}>
            <View
              style={[
                styles.dividerIconBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <ArrowRightLeft size={18} color={colors.transfer} />
            </View>
          </View>

          {/* To Account */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              To Account
            </Text>
          </View>
          <AccountPicker
            accounts={accounts}
            selectedId={toAccountId}
            onSelect={(a) => setToAccountId(a.id)}
          />

          {/* Note */}
          <View style={styles.noteContainer}>
            <Input
              label="Note (optional)"
              placeholder="e.g., ATM withdrawal, wallet reload"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={styles.bottom}>
          <Button
            title="Complete Transfer"
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
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  indicatorContainer: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  dividerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
});
