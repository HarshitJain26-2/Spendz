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
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Plus, Users } from 'lucide-react-native';
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
import { useFriendStore } from '@/store/friendStore';
import { useSplitStore } from '@/store/splitStore';
import { getTodayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { calculateEqualSplit } from '@/utils/calculations';
import { typography } from '@/theme/typography';
import { borderRadius, spacing, shadows } from '@/theme/spacing';

export default function AddSplitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const addSplitExpense = useSplitStore((s) => s.addSplitExpense);
  const categories = useCategoryStore((s) => s.categories);
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );
  const accounts = useAccountStore((s) => s.accounts);
  const friends = useFriendStore((s) => s.friends);
  const addFriend = useFriendStore((s) => s.addFriend);

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(
    expenseCategories[0]?.id || null
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');

  // Payer state: Me or selected friend
  const [paidByType, setPaidByType] = useState<'me' | 'friend'>('me');
  const [paidByFriendId, setPaidByFriendId] = useState<string | null>(null);

  // Participant selection: "You" (Me) is selectable, default is true
  const [isMeSelected, setIsMeSelected] = useState<boolean>(true);
  // Selected friends IDs
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  // Custom amounts per participant
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Quick inline add friend modal / state
  const [newFriendName, setNewFriendName] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // Ensure default account & category are selected when loaded
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (!categoryId && expenseCategories.length > 0) {
      setCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, categoryId]);

  const effectiveAccountId = accountId || accounts[0]?.id || '';
  const effectiveCategoryId = categoryId || expenseCategories[0]?.id || null;

  // Synchronizes the payer whenever participant selection changes (Me or friends)
  const syncPayer = (_newMeSelected: boolean, newFriendIds: string[]) => {
    // If 'me' is paying, 'me' is always a valid payer
    if (paidByType === 'me') {
      return;
    }

    // If a friend is paying, verify they are still selected
    if (paidByType === 'friend') {
      if (paidByFriendId && newFriendIds.includes(paidByFriendId)) {
        return;
      }
      // Payer friend is no longer participating: default back to Me
      setPaidByType('me');
      setPaidByFriendId(null);
    }
  };

  const toggleMe = () => {
    const nextMeSelected = !isMeSelected;
    setIsMeSelected(nextMeSelected);
    syncPayer(nextMeSelected, selectedFriendIds);
  };

  const toggleFriend = (id: string) => {
    let nextFriendIds: string[];
    if (selectedFriendIds.includes(id)) {
      nextFriendIds = selectedFriendIds.filter((fId) => fId !== id);
    } else {
      nextFriendIds = [...selectedFriendIds, id];
    }
    setSelectedFriendIds(nextFriendIds);
    syncPayer(isMeSelected, nextFriendIds);
  };

  const handleQuickAddFriend = () => {
    if (!newFriendName.trim()) return;
    const friend = addFriend({ name: newFriendName.trim() });
    const nextFriendIds = [...selectedFriendIds, friend.id];
    setSelectedFriendIds(nextFriendIds);
    setNewFriendName('');
    setIsAddingFriend(false);
    syncPayer(isMeSelected, nextFriendIds);
  };

  const totalNum = parseFloat(amount) || 0;
  const totalParticipants = (isMeSelected ? 1 : 0) + selectedFriendIds.length;

  const isFriendPaid = paidByType === 'friend' && Boolean(paidByFriendId);
  const payerFriend = isFriendPaid
    ? friends.find((f) => f.id === paidByFriendId)
    : null;

  // Calculate shares
  const equalShares =
    totalNum > 0 && totalParticipants > 0
      ? calculateEqualSplit(totalNum, totalParticipants)
      : [];
  const equalShare = equalShares[0] || 0;

  const handleCustomAmountChange = (key: string, val: string) => {
    let cleaned = val.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const firstDotIndex = cleaned.indexOf('.');
    if (firstDotIndex !== -1) {
      cleaned =
        cleaned.slice(0, firstDotIndex + 1) +
        cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
    }
    const parts = cleaned.split('.');
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].slice(0, 2);
    }
    cleaned = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
    setCustomAmounts((prev) => ({ ...prev, [key]: cleaned }));
  };

  const customTotal = useMemo(() => {
    let sum = 0;
    if (isMeSelected) {
      sum += parseFloat(customAmounts['you']) || 0;
    }
    for (const fId of selectedFriendIds) {
      sum += parseFloat(customAmounts[fId]) || 0;
    }
    return sum;
  }, [isMeSelected, selectedFriendIds, customAmounts]);

  const handleSubmit = () => {
    if (totalNum <= 0) return;

    if (totalParticipants === 0) {
      Alert.alert('Select Participants', 'Select at least one participant.');
      return;
    }

    if (isMeSelected && selectedFriendIds.length === 0) {
      Alert.alert('Split with whom?', 'Please select at least one friend to split with.');
      return;
    }

    if (paidByType === 'friend' && !payerFriend) {
      Alert.alert('Select Payer', 'Please choose a valid participant who paid.');
      return;
    }

    if (paidByType === 'me' && !effectiveAccountId) {
      Alert.alert('Select Account', 'Please select an account from which you paid.');
      return;
    }

    if (splitMethod === 'custom' && Math.abs(customTotal - totalNum) > 0.5) {
      Alert.alert(
        'Amounts Mismatch',
        `Sum of custom shares (${formatCurrency(customTotal)}) does not equal total amount (${formatCurrency(totalNum)}).`
      );
      return;
    }

    // 1. Create main expense transaction with FULL total amount
    const transaction = addTransaction({
      type: 'expense',
      amount: totalNum,
      categoryId: effectiveCategoryId,
      accountId: effectiveAccountId,
      note: note.trim() || (isFriendPaid ? `Split Expense (Paid by ${payerFriend?.name})` : 'Split Expense'),
      date: getTodayISO(),
      skipBalanceUpdate: isFriendPaid, // Zero account outflow when friend paid!
    });

    // 2. Prepare participants list
    let participants: Array<{ friendId: string | null; name: string; amount: number }> = [];

    if (splitMethod === 'equal') {
      let shareIdx = 0;
      if (isMeSelected) {
        participants.push({
          friendId: null,
          name: 'You',
          amount: equalShares[shareIdx++] || 0,
        });
      }
      selectedFriendIds.forEach((fId) => {
        const friend = friends.find((f) => f.id === fId);
        if (friend) {
          participants.push({
            friendId: friend.id,
            name: friend.name,
            amount: equalShares[shareIdx++] || equalShare,
          });
        }
      });
    } else {
      // Custom
      if (isMeSelected) {
        participants.push({
          friendId: null,
          name: 'You',
          amount: parseFloat(customAmounts['you']) || 0,
        });
      }
      for (const fId of selectedFriendIds) {
        const friend = friends.find((f) => f.id === fId);
        if (friend) {
          participants.push({
            friendId: friend.id,
            name: friend.name,
            amount: parseFloat(customAmounts[fId]) || 0,
          });
        }
      }
    }

    // 3. Add Split Expense
    addSplitExpense({
      transactionId: transaction.id,
      totalAmount: totalNum,
      splitMethod,
      paidByType,
      paidByFriendId: isFriendPaid ? paidByFriendId : null,
      participants,
    });

    router.dismiss();
  };

  const hasValidParticipants =
    (isMeSelected && selectedFriendIds.length > 0) ||
    (!isMeSelected && selectedFriendIds.length > 0);

  const hasValidPayer =
    (paidByType === 'me' && Boolean(effectiveAccountId)) ||
    (paidByType === 'friend' && Boolean(paidByFriendId) && selectedFriendIds.includes(paidByFriendId!));

  const isCustomValid =
    splitMethod === 'equal' || Math.abs(customTotal - totalNum) <= 0.5;

  const isValid =
    totalNum > 0 &&
    hasValidParticipants &&
    hasValidPayer &&
    isCustomValid;

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
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleGroup}>
            <Image
              source={require('@/assets/images/spendz-logo.png')}
              style={styles.logoBadge}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Split Expense
            </Text>
          </View>
          <Avatar name="You" size={36} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <AmountInput value={amount} onChangeText={setAmount} />

          {/* Category */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Category
            </Text>
          </View>
          <CategoryPicker
            categories={expenseCategories}
            selectedId={categoryId}
            onSelect={(c) => setCategoryId(c.id)}
          />

          {/* Friends Selector */}
          <View style={[styles.sectionHeader, styles.splitBetweenHeader]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Split With
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddingFriend(true)}
              style={styles.addFriendBtn}
            >
              <Plus size={16} color={colors.accent} />
              <Text style={[styles.addFriendText, { color: colors.accent }]}>
                Add Friend
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inline quick friend create */}
          {isAddingFriend && (
            <View
              style={[
                styles.quickAddBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                placeholder="Friend's Name"
                placeholderTextColor={colors.textTertiary}
                value={newFriendName}
                onChangeText={setNewFriendName}
                style={[
                  styles.quickAddInput,
                  { color: colors.textPrimary, borderColor: colors.border },
                ]}
                autoFocus
              />
              <View style={styles.quickAddActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  size="sm"
                  onPress={() => setIsAddingFriend(false)}
                />
                <Button
                  title="Add"
                  size="sm"
                  onPress={handleQuickAddFriend}
                  disabled={!newFriendName.trim()}
                />
              </View>
            </View>
          )}

          {/* Friends List chips */}
          <View style={styles.friendsContainer}>
            {/* You (Me) */}
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

            {friends.map((f) => {
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

          {/* Paid By Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Paid By
            </Text>
          </View>
          <View
            style={[
              styles.payerContainer,
              {
                backgroundColor: colors.surface,
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

            {/* Selected Friends Options */}
            {selectedFriendIds.map((fId, idx) => {
              const friend = friends.find((f) => f.id === fId);
              if (!friend) return null;
              const isSelectedPayer = paidByType === 'friend' && paidByFriendId === friend.id;
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
          </View>

          {/* Paid from Account (Only when Me paid) */}
          {paidByType === 'me' ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  Paid From Account
                </Text>
              </View>
              <AccountPicker
                accounts={accounts}
                selectedId={effectiveAccountId}
                onSelect={(a) => setAccountId(a.id)}
              />
            </>
          ) : (
            <View
              style={[
                styles.friendPaidInfo,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.friendPaidIconBox,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Users size={16} color={colors.accent} />
              </View>
              <Text style={[styles.friendPaidInfoText, { color: colors.textSecondary }]}>
                {payerFriend?.name || 'Friend'} paid the full bill • No money deducted from your accounts
              </Text>
            </View>
          )}

          {/* Split Mode Selector (Equal vs Custom) */}
          <View
            style={[
              styles.modeSelectorContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setSplitMethod('equal')}
              activeOpacity={0.8}
              style={[
                styles.modeBtn,
                splitMethod === 'equal' && {
                  backgroundColor: colors.accent,
                  ...shadows.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  {
                    color:
                      splitMethod === 'equal'
                        ? '#FFFFFF'
                        : colors.textSecondary,
                  },
                ]}
              >
                Split Equally
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSplitMethod('custom')}
              activeOpacity={0.8}
              style={[
                styles.modeBtn,
                splitMethod === 'custom' && {
                  backgroundColor: colors.accent,
                  ...shadows.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  {
                    color:
                      splitMethod === 'custom'
                        ? '#FFFFFF'
                        : colors.textSecondary,
                  },
                ]}
              >
                Custom Amounts
              </Text>
            </TouchableOpacity>
          </View>

          {/* Calculation Summary / Custom Input Area */}
          {splitMethod === 'equal' ? (
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.textSecondary }}>
                  Total Participants:
                </Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                  {totalParticipants}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ color: colors.textSecondary }}>
                  Each Person Pays:
                </Text>
                <Text
                  style={{
                    color: colors.accent,
                    fontFamily: typography.fontFamily.bold,
                    fontSize: 18,
                  }}
                >
                  {formatCurrency(equalShare)}
                </Text>
              </View>
              {selectedFriendIds.length > 0 && (
                <Text
                  style={[
                    styles.summaryNote,
                    { color: colors.textTertiary },
                  ]}
                >
                  {isFriendPaid
                    ? isMeSelected
                      ? `${payerFriend?.name || 'Friend'} paid ${formatCurrency(totalNum)}. You will owe ${payerFriend?.name || 'them'} ${formatCurrency(equalShare)}.`
                      : `${payerFriend?.name || 'Friend'} paid ${formatCurrency(totalNum)}. You are not participating in this split.`
                    : `You will be owed ${formatCurrency(equalShare * selectedFriendIds.length)} in total.`}
                </Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.customCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* You input */}
              {isMeSelected && (
                <View style={styles.customRow}>
                  <Text style={[styles.customName, { color: colors.textPrimary }]}>
                    You
                  </Text>
                  <View style={styles.customInputWrap}>
                    <Text style={{ color: colors.textSecondary, marginRight: 4 }}>
                      ₹
                    </Text>
                    <TextInput
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                      cursorColor={colors.accent}
                      selectionColor={colors.accent}
                      value={customAmounts['you'] || ''}
                      onChangeText={(val) => handleCustomAmountChange('you', val)}
                      style={[
                        styles.customInput,
                        { color: colors.textPrimary, borderColor: colors.border },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Friends input */}
              {selectedFriendIds.map((fId) => {
                const friend = friends.find((f) => f.id === fId);
                if (!friend) return null;
                return (
                  <View key={fId} style={styles.customRow}>
                    <Text
                      style={[styles.customName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {friend.name}
                    </Text>
                    <View style={styles.customInputWrap}>
                      <Text style={{ color: colors.textSecondary, marginRight: 4 }}>
                        ₹
                      </Text>
                      <TextInput
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="decimal-pad"
                        cursorColor={colors.accent}
                        selectionColor={colors.accent}
                        value={customAmounts[fId] || ''}
                        onChangeText={(val) =>
                          handleCustomAmountChange(fId, val)
                        }
                        style={[
                          styles.customInput,
                          {
                            color: colors.textPrimary,
                            borderColor: colors.border,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}

              <View
                style={[
                  styles.customTotalRow,
                  { borderTopColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.textSecondary }}>
                  Total Entered:
                </Text>
                <Text
                  style={{
                    color:
                      Math.abs(customTotal - totalNum) <= 0.5
                        ? colors.accent
                        : colors.expense,
                    fontWeight: '700',
                  }}
                >
                  {formatCurrency(customTotal)} / {formatCurrency(totalNum)}
                </Text>
              </View>
              {selectedFriendIds.length > 0 && Math.abs(customTotal - totalNum) <= 0.5 && (
                <Text
                  style={[
                    styles.summaryNote,
                    { color: colors.textTertiary, marginTop: spacing.xs },
                  ]}
                >
                  {isFriendPaid
                    ? isMeSelected
                      ? `${payerFriend?.name || 'Friend'} paid ${formatCurrency(totalNum)}. You will owe ${payerFriend?.name || 'them'} ${formatCurrency(parseFloat(customAmounts['you']) || 0)}.`
                      : `${payerFriend?.name || 'Friend'} paid ${formatCurrency(totalNum)}. You are not participating in this split.`
                    : `You will be owed ${formatCurrency(totalNum - (isMeSelected ? (parseFloat(customAmounts['you']) || 0) : 0))} in total.`}
                </Text>
              )}
            </View>
          )}

          {/* Note */}
          <View style={styles.noteContainer}>
            <Input
              label="Note (optional)"
              placeholder="e.g., Pizza night, road trip fuel"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        {/* Submit */}
        <View
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <Button
            title="Add Split Expense"
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
  backBtn: {
    padding: spacing.xs,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
  splitBetweenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addFriendText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.small,
  },
  quickAddBox: {
    marginHorizontal: spacing.xl,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    ...shadows.sm,
  },
  quickAddInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  quickAddActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
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
  modeSelectorContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    padding: 4,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 4,
    ...shadows.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  summaryCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryNote: {
    fontSize: 12,
    marginTop: 4,
  },
  customCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    ...shadows.sm,
  },
  customRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customName: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.medium,
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customInput: {
    width: 90,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
    fontSize: 15,
  },
  customTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  noteContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  payerContainer: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
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
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  friendPaidIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendPaidInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 18,
  },
});

