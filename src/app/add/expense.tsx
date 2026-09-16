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
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { AmountInput } from '@/components/ui/AmountInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryPicker } from '@/components/transaction/CategoryPicker';
import { AccountPicker } from '@/components/transaction/AccountPicker';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAccountStore } from '@/store/accountStore';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const expenseCategories = useCategoryStore((s) => s.getExpenseCategories());
  const accounts = useAccountStore((s) => s.accounts);

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!accountId) return;

    addTransaction({
      type: 'expense',
      amount: parsedAmount,
      categoryId,
      accountId,
      note: note.trim(),
      date: getTodayISO(),
    });

    router.dismiss();
  };

  const isValid = parseFloat(amount) > 0 && accountId;

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
          <Text style={[styles.title, { color: colors.expense }]}>
            Add Expense
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <AmountInput value={amount} onChangeText={setAmount} />

          {/* Category */}
          <CategoryPicker
            categories={expenseCategories}
            selectedId={categoryId}
            onSelect={(c) => setCategoryId(c.id)}
          />

          {/* Account */}
          <AccountPicker
            accounts={accounts}
            selectedId={accountId}
            onSelect={(a) => setAccountId(a.id)}
          />

          {/* Note */}
          <View style={styles.noteContainer}>
            <Input
              label="Note (optional)"
              placeholder="What was this for?"
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
            title="Add Expense"
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
  noteContainer: {
    paddingHorizontal: spacing.xl,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
});
