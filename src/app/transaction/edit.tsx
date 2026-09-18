import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Users } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { AmountInput } from '@/components/ui/AmountInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { CategoryPicker } from '@/components/transaction/CategoryPicker';
import { AccountPicker } from '@/components/transaction/AccountPicker';
import { useTransactionStore } from '@/store/transactionStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useAccountStore } from '@/store/accountStore';
import { useSplitStore } from '@/store/splitStore';
import { useFriendStore } from '@/store/friendStore';
import type { PaidByType } from '@/types';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const transactions = useTransactionStore((s) => s.transactions);
  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id]
  );
  const updateTransaction = useTransactionStore((s) => s.updateTransaction);
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);
  const splitExpenses = useSplitStore((s) => s.splitExpenses);
  const updateSplitExpense = useSplitStore((s) => s.updateSplitExpense);
  const friends = useFriendStore((s) => s.friends);

  const splitExpense = useMemo(
    () => splitExpenses.find((s) => s.transactionId === id),
    [splitExpenses, id]
  );

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [paidByType, setPaidByType] = useState<PaidByType>('me');
  const [paidByFriendId, setPaidByFriendId] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId);
      setNote(transaction.note || '');
    }
  }, [transaction]);

  useEffect(() => {
    if (splitExpense) {
      setPaidByType(splitExpense.paidByType || 'me');
      setPaidByFriendId(splitExpense.paidByFriendId || null);
    }
  }, [splitExpense]);

  if (!transaction) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={{ color: colors.textSecondary }}>
            Transaction not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFriendPaid = Boolean(splitExpense && paidByType === 'friend' && paidByFriendId);
  const payerFriend = friends.find((f) => f.id === paidByFriendId);

  // Participants who are friends in this split
  const friendParticipants = useMemo(() => {
    if (!splitExpense?.participants) return [];
    return splitExpense.participants
      .filter((p) => p.friendId !== null)
      .map((p) => {
        const found = friends.find((f) => f.id === p.friendId);
        return {
          id: p.friendId as string,
          name: found?.name || p.name,
        };
      });
  }, [splitExpense, friends]);

  const filteredCategories = categories.filter(
    (c) => c.type === (transaction.type === 'income' ? 'income' : 'expense')
  );

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!isFriendPaid && !accountId) return;

    const wasPaidByFriend = splitExpense?.paidByType === 'friend';

    // 1. Update split expense if linked
    if (splitExpense) {
      const isPayerChanged =
        splitExpense.paidByType !== paidByType ||
        splitExpense.paidByFriendId !== (isFriendPaid ? paidByFriendId : null);

      let updatedParticipants = splitExpense.participants;

      if (isPayerChanged && updatedParticipants) {
        const now = getTodayISO();
        updatedParticipants = updatedParticipants.map((p) => {
          if (paidByType === 'me') {
            const isUser = p.friendId === null;
            return {
              ...p,
              isPaid: isUser,
              settledAt: isUser ? now : null,
            };
          } else {
            const isPayer = p.friendId === paidByFriendId;
            return {
              ...p,
              isPaid: isPayer,
              settledAt: isPayer ? now : null,
            };
          }
        });
      }

      // If total amount changed and equal split, adjust participant amounts proportionally
      if (parsedAmount !== splitExpense.totalAmount && updatedParticipants && updatedParticipants.length > 0) {
        const count = updatedParticipants.length;
        const newEqual = Math.round((parsedAmount / count) * 100) / 100;
        let runningTotal = 0;
        updatedParticipants = updatedParticipants.map((p, idx) => {
          if (idx === count - 1) {
            return { ...p, amount: Math.round((parsedAmount - runningTotal) * 100) / 100 };
          }
          runningTotal += newEqual;
          return { ...p, amount: newEqual };
        });
      }

      updateSplitExpense(
        splitExpense.id,
        {
          totalAmount: parsedAmount,
          paidByType,
          paidByFriendId: isFriendPaid ? paidByFriendId : null,
        },
        updatedParticipants
      );
    }

    // 2. Update transaction: amount ALWAYS remains the full total bill amount
    updateTransaction(
      transaction.id,
      {
        amount: parsedAmount,
        categoryId,
        accountId: accountId || transaction.accountId,
        note: note.trim(),
      },
      {
        skipBalanceUpdate: isFriendPaid,
        wasPaidByFriend,
      }
    );

    router.back();
  };

  const isValid =
    parseFloat(amount) > 0 &&
    (isFriendPaid || Boolean(accountId)) &&
    (!splitExpense || paidByType === 'me' || (isFriendPaid && Boolean(payerFriend)));

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
            Edit Transaction
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <AmountInput value={amount} onChangeText={setAmount} />

          {/* Paid By Selector (Only for Split Expenses) */}
          {splitExpense && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Paid By
                </Text>
              </View>
              <View
                style={[
                  styles.payerContainer,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Option: Me */}
                <TouchableOpacity
                  onPress={() => {
                    setPaidByType('me');
                    setPaidByFriendId(null);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.payerRow,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth: friendParticipants.length > 0 ? 1 : 0,
                    },
                  ]}
                >
                  <View style={styles.payerLeft}>
                    <Avatar name="You" size={32} />
                    <Text style={[styles.payerName, { color: colors.textPrimary }]}>
                      Me
                    </Text>
                  </View>
                  {paidByType === 'me' && (
                    <Check size={18} color={colors.accent} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {/* Split Participants Friends */}
                {friendParticipants.map((friend, idx) => {
                  const isSelectedPayer =
                    paidByType === 'friend' && paidByFriendId === friend.id;
                  const isLast = idx === friendParticipants.length - 1;

                  return (
                    <TouchableOpacity
                      key={friend.id}
                      onPress={() => {
                        setPaidByType('friend');
                        setPaidByFriendId(friend.id);
                      }}
                      activeOpacity={0.7}
                      style={[
                        styles.payerRow,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth: isLast ? 0 : 1,
                        },
                      ]}
                    >
                      <View style={styles.payerLeft}>
                        <Avatar name={friend.name} size={32} />
                        <Text style={[styles.payerName, { color: colors.textPrimary }]}>
                          {friend.name}
                        </Text>
                      </View>
                      {isSelectedPayer && (
                        <Check size={18} color={colors.accent} strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Account Picker or Friend Paid Notice */}
          {isFriendPaid ? (
            <View
              style={[
                styles.friendPaidInfo,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Users size={18} color={colors.accent} />
              <Text style={[styles.friendPaidInfoText, { color: colors.textSecondary }]}>
                {payerFriend?.name || 'Friend'} paid the full bill • No money deducted from your accounts
              </Text>
            </View>
          ) : (
            <>
              {splitExpense && (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Paid From Account
                  </Text>
                </View>
              )}
              <AccountPicker
                accounts={accounts}
                selectedId={accountId}
                onSelect={(a) => setAccountId(a.id)}
              />
            </>
          )}

          {/* Category (if not transfer) */}
          {transaction.type !== 'transfer' && (
            <CategoryPicker
              categories={filteredCategories}
              selectedId={categoryId}
              onSelect={(c) => setCategoryId(c.id)}
            />
          )}

          {/* Note */}
          <View style={styles.noteContainer}>
            <Input
              label="Note"
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
            title="Save Changes"
            onPress={handleSave}
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
    marginTop: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    marginTop: spacing.lg,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payerContainer: {
    marginHorizontal: spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  payerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  payerName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
  },
  friendPaidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  friendPaidInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
  },
});

