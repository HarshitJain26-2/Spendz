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
import { Card } from '@/components/ui/Card';
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
import { spacing, borderRadius, shadows } from '@/theme/spacing';

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
            <ArrowLeft size={22} color={colors.textPrimary} />
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

      if (updatedParticipants && updatedParticipants.length > 0) {
        const isAmountChanged = parsedAmount !== splitExpense.totalAmount;
        if (isAmountChanged && splitExpense.splitMethod === 'equal') {
          const count = updatedParticipants.length;
          const equalShare = Math.round((parsedAmount / count) * 100) / 100;
          updatedParticipants = updatedParticipants.map((p, idx) => ({
            ...p,
            amount: idx === 0 ? parsedAmount - equalShare * (count - 1) : equalShare,
          }));
        }
      }

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

    // 2. Update transaction
    updateTransaction(
      transaction.id,
      {
        amount: parsedAmount,
        categoryId,
        accountId: isFriendPaid ? (transaction.accountId || accounts[0]?.id || '') : accountId,
        note: note.trim() || undefined,
      },
      {
        skipBalanceUpdate: isFriendPaid,
        wasPaidByFriend: splitExpense ? splitExpense.paidByType === 'friend' : false,
      }
    );

    router.back();
  };

  const isValid = parseFloat(amount) > 0 && (isFriendPaid || Boolean(accountId));

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
            Edit Transaction
          </Text>
          <View style={{ width: 36 }} />
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
                  PAID BY
                </Text>
              </View>
              <Card
                padding="none"
                style={styles.payerContainer}
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
              </Card>
            </>
          )}

          {/* Account Picker or Friend Paid Notice */}
          {isFriendPaid ? (
            <Card
              padding="md"
              style={styles.friendPaidInfo}
            >
              <View style={styles.friendPaidRow}>
                <Users size={18} color={colors.accent} />
                <Text style={[styles.friendPaidInfoText, { color: colors.textSecondary }]}>
                  {payerFriend?.name || 'Friend'} paid the full bill • No money deducted from your accounts
                </Text>
              </View>
            </Card>
          ) : (
            <>
              {splitExpense && (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    PAID FROM ACCOUNT
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
        <View style={[styles.bottom, { backgroundColor: colors.background }]}>
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
  noteContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingTop: spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    letterSpacing: 0.8,
  },
  payerContainer: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
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
    fontFamily: typography.fontFamily.semiBold,
  },
  friendPaidInfo: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    marginTop: spacing.sm,
  },
  friendPaidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  friendPaidInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
  },
});
