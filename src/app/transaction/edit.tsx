import React, { useState, useEffect, useMemo } from 'react';
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
import type { PaidByType, SplitParticipant } from '@/types';
import { getTodayISO, generateId } from '@/utils/date';
import { calculateEqualSplit } from '@/utils/calculations';
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
  const [isMeSelected, setIsMeSelected] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

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

      const hasMe = splitExpense.participants
        ? splitExpense.participants.some((p) => p.friendId === null)
        : true;
      setIsMeSelected(hasMe);

      const friendIds = splitExpense.participants
        ? splitExpense.participants
            .filter((p) => p.friendId !== null)
            .map((p) => p.friendId as string)
        : [];
      setSelectedFriendIds(friendIds);
    }
  }, [splitExpense]);

  // Combine friend store with any participants previously on this split
  const allAvailableFriends = useMemo(() => {
    const list = [...friends];
    if (splitExpense?.participants) {
      for (const p of splitExpense.participants) {
        if (p.friendId && !list.some((f) => f.id === p.friendId)) {
          list.push({
            id: p.friendId,
            name: p.name,
            phone: null,
            avatarColor: '#2A9D8F',
            createdAt: '',
          });
        }
      }
    }
    return list;
  }, [friends, splitExpense]);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(transaction?.accountId || accounts[0].id);
    }
  }, [accounts, accountId, transaction]);

  const effectiveAccountId = accountId || transaction?.accountId || accounts[0]?.id || '';

  const syncPayer = (_newMeSelected: boolean, newFriendIds: string[]) => {
    if (paidByType === 'me') {
      return;
    }
    if (paidByType === 'friend') {
      if (paidByFriendId && newFriendIds.includes(paidByFriendId)) {
        return;
      }
      setPaidByType('me');
      setPaidByFriendId(null);
    }
  };

  const toggleMe = () => {
    const next = !isMeSelected;
    setIsMeSelected(next);
    syncPayer(next, selectedFriendIds);
  };

  const toggleFriend = (friendId: string) => {
    let next: string[];
    if (selectedFriendIds.includes(friendId)) {
      next = selectedFriendIds.filter((id) => id !== friendId);
    } else {
      next = [...selectedFriendIds, friendId];
    }
    setSelectedFriendIds(next);
    syncPayer(isMeSelected, next);
  };

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
  const payerFriend = allAvailableFriends.find((f) => f.id === paidByFriendId);

  const filteredCategories = categories.filter(
    (c) => c.type === (transaction.type === 'income' ? 'income' : 'expense')
  );

  const hasValidParticipants =
    (isMeSelected && selectedFriendIds.length > 0) ||
    (!isMeSelected && selectedFriendIds.length > 0);

  const hasValidPayer =
    (paidByType === 'me' && Boolean(effectiveAccountId)) ||
    (paidByType === 'friend' && Boolean(paidByFriendId) && selectedFriendIds.includes(paidByFriendId!));

  const isSplitExpenseValid = !splitExpense || (
    hasValidParticipants && hasValidPayer
  );

  const isValid =
    parseFloat(amount) > 0 &&
    (splitExpense ? isSplitExpenseValid : (transaction.type === 'transfer' || Boolean(effectiveAccountId)));

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    if (splitExpense) {
      if (!hasValidParticipants) {
        Alert.alert('Select Participants', 'Please select at least one friend to split with.');
        return;
      }
      if (paidByType === 'me' && !effectiveAccountId) {
        Alert.alert('Invalid Selection', 'Please select an account for payment.');
        return;
      }
      if (paidByType === 'friend' && (!paidByFriendId || !selectedFriendIds.includes(paidByFriendId))) {
        Alert.alert('Invalid Selection', 'Please choose a participating friend as payer.');
        return;
      }
    } else {
      if (transaction.type !== 'transfer' && !effectiveAccountId) return;
    }

    // 1. Update split expense if linked
    if (splitExpense) {
      const now = getTodayISO();
      let updatedParticipants: SplitParticipant[] = [];

      if (splitExpense.splitMethod === 'equal') {
        const totalCount = (isMeSelected ? 1 : 0) + selectedFriendIds.length;
        const equalShares = calculateEqualSplit(parsedAmount, totalCount);
        let shareIdx = 0;

        if (isMeSelected) {
          const isPaid = paidByType === 'me';
          const prevMe = splitExpense.participants?.find((p) => p.friendId === null);
          updatedParticipants.push({
            id: prevMe?.id || generateId(),
            splitExpenseId: splitExpense.id,
            friendId: null,
            name: 'You',
            amount: equalShares[shareIdx++] || 0,
            isPaid,
            settledAt: isPaid ? now : null,
          });
        }

        for (const fId of selectedFriendIds) {
          const friend = allAvailableFriends.find((f) => f.id === fId);
          const prevPart = splitExpense.participants?.find((p) => p.friendId === fId);
          const isPaid = paidByType === 'friend' && paidByFriendId === fId;
          updatedParticipants.push({
            id: prevPart?.id || generateId(),
            splitExpenseId: splitExpense.id,
            friendId: fId,
            name: friend?.name || prevPart?.name || 'Friend',
            amount: equalShares[shareIdx++] || 0,
            isPaid,
            settledAt: isPaid ? now : null,
          });
        }
      } else {
        // Custom split method
        if (isMeSelected) {
          const prevMe = splitExpense.participants?.find((p) => p.friendId === null);
          const isPaid = paidByType === 'me';
          updatedParticipants.push({
            id: prevMe?.id || generateId(),
            splitExpenseId: splitExpense.id,
            friendId: null,
            name: 'You',
            amount: prevMe?.amount || 0,
            isPaid,
            settledAt: isPaid ? now : null,
          });
        }

        for (const fId of selectedFriendIds) {
          const friend = allAvailableFriends.find((f) => f.id === fId);
          const prevPart = splitExpense.participants?.find((p) => p.friendId === fId);
          const isPaid = paidByType === 'friend' && paidByFriendId === fId;
          updatedParticipants.push({
            id: prevPart?.id || generateId(),
            splitExpenseId: splitExpense.id,
            friendId: fId,
            name: friend?.name || prevPart?.name || 'Friend',
            amount: prevPart?.amount || 0,
            isPaid,
            settledAt: isPaid ? now : null,
          });
        }

        const customSum = updatedParticipants.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(customSum - parsedAmount) > 0.5) {
          Alert.alert(
            'Amounts Mismatch',
            `Sum of custom shares does not equal total amount.`
          );
          return;
        }
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

          {/* Participants & Paid By Selector (Only for Split Expenses) */}
          {splitExpense && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  PARTICIPANTS
                </Text>
              </View>
              <View style={styles.friendsContainer}>
                {/* You chip */}
                <TouchableOpacity
                  onPress={toggleMe}
                  activeOpacity={0.7}
                  style={[
                    styles.friendChip,
                    {
                      backgroundColor: isMeSelected
                        ? colors.accentLight
                        : colors.surface,
                      borderColor: isMeSelected
                        ? colors.accent
                        : colors.border,
                    },
                  ]}
                >
                  <Avatar name="You" size={28} />
                  <Text
                    style={[
                      styles.friendChipName,
                      {
                        color: isMeSelected
                          ? colors.accent
                          : colors.textPrimary,
                        fontWeight: isMeSelected ? '600' : '400',
                      },
                    ]}
                  >
                    You
                  </Text>
                  {isMeSelected && (
                    <Check size={14} color={colors.accent} strokeWidth={3} />
                  )}
                </TouchableOpacity>

                {allAvailableFriends.map((f) => {
                  const isSelected = selectedFriendIds.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      onPress={() => toggleFriend(f.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.friendChip,
                        {
                          backgroundColor: isSelected
                            ? colors.accentLight
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.accent
                            : colors.border,
                        },
                      ]}
                    >
                      <Avatar name={f.name} size={28} />
                      <Text
                        style={[
                          styles.friendChipName,
                          {
                            color: isSelected
                              ? colors.accent
                              : colors.textPrimary,
                            fontWeight: isSelected ? '600' : '400',
                          },
                        ]}
                      >
                        {f.name}
                      </Text>
                      {isSelected && (
                        <Check size={14} color={colors.accent} strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

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
                      borderBottomWidth: selectedFriendIds.length > 0 ? 1 : 0,
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

                {/* Selected Friends */}
                {selectedFriendIds.map((fId, idx) => {
                  const friend = allAvailableFriends.find((f) => f.id === fId);
                  if (!friend) return null;
                  const isSelectedPayer =
                    paidByType === 'friend' && paidByFriendId === friend.id;
                  const isLast = idx === selectedFriendIds.length - 1;

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
                selectedId={effectiveAccountId}
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
  friendsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  friendChipName: {
    fontSize: 14,
  },
});
