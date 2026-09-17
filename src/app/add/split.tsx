import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { spacing } from '@/theme/spacing';

export default function AddSplitScreen() {
  const router = useRouter();
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
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');

  // Selected friends IDs (You is always implicit)
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  // Custom amounts per participant
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Quick inline add friend modal / state
  const [newFriendName, setNewFriendName] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  const toggleFriend = (id: string) => {
    if (selectedFriendIds.includes(id)) {
      setSelectedFriendIds(selectedFriendIds.filter((fId) => fId !== id));
    } else {
      setSelectedFriendIds([...selectedFriendIds, id]);
    }
  };

  const handleQuickAddFriend = () => {
    if (!newFriendName.trim()) return;
    const friend = addFriend({ name: newFriendName.trim() });
    setSelectedFriendIds([...selectedFriendIds, friend.id]);
    setNewFriendName('');
    setIsAddingFriend(false);
  };

  const totalNum = parseFloat(amount) || 0;
  const totalParticipants = selectedFriendIds.length + 1; // +1 for "You"

  // Calculate shares
  const equalShares =
    totalNum > 0 && totalParticipants > 0
      ? calculateEqualSplit(totalNum, totalParticipants)
      : [];
  const equalShare = equalShares[0] || 0;

  const handleCustomAmountChange = (key: string, val: string) => {
    setCustomAmounts((prev) => ({ ...prev, [key]: val }));
  };

  const customTotal = Object.values(customAmounts).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );

  const handleSubmit = () => {
    if (totalNum <= 0 || !accountId) return;

    if (selectedFriendIds.length === 0) {
      Alert.alert('Split with whom?', 'Please select at least one friend to split with.');
      return;
    }

    if (splitMethod === 'custom' && Math.abs(customTotal - totalNum) > 0.5) {
      Alert.alert(
        'Amounts Mismatch',
        `Sum of custom shares (${formatCurrency(customTotal)}) does not equal total amount (${formatCurrency(totalNum)}).`
      );
      return;
    }

    // 1. Create main expense transaction
    const transaction = addTransaction({
      type: 'expense',
      amount: totalNum,
      categoryId,
      accountId,
      note: note.trim() || 'Split Expense',
      date: getTodayISO(),
    });

    // 2. Prepare participants list
    let participants: Array<{ friendId: string | null; name: string; amount: number }> = [];

    if (splitMethod === 'equal') {
      // You
      participants.push({
        friendId: null,
        name: 'You',
        amount: equalShares[0] || 0,
      });
      // Friends
      selectedFriendIds.forEach((fId, idx) => {
        const friend = friends.find((f) => f.id === fId);
        if (friend) {
          participants.push({
            friendId: friend.id,
            name: friend.name,
            amount: equalShares[idx + 1] || equalShare,
          });
        }
      });
    } else {
      // Custom
      const youAmt = parseFloat(customAmounts['you']) || 0;
      participants.push({
        friendId: null,
        name: 'You',
        amount: youAmt,
      });
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
      participants,
    });

    router.dismiss();
  };

  const isValid =
    totalNum > 0 &&
    Boolean(accountId) &&
    selectedFriendIds.length > 0 &&
    (splitMethod === 'equal' || Math.abs(customTotal - totalNum) <= 0.5);

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
          <Text style={[styles.title, { color: colors.accent }]}>
            Split Expense
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <AmountInput value={amount} onChangeText={setAmount} />

          {/* Paid by Account */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Paid By (Your Account)
            </Text>
          </View>
          <AccountPicker
            accounts={accounts}
            selectedId={accountId}
            onSelect={(a) => setAccountId(a.id)}
          />

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
                  backgroundColor: colors.surfaceElevated,
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
            {/* You (Always selected) */}
            <View
              style={[
                styles.friendChip,
                {
                  backgroundColor: colors.accent + '20',
                  borderColor: colors.accent,
                },
              ]}
            >
              <Avatar name="You" size={28} />
              <Text
                style={[
                  styles.friendChipName,
                  { color: colors.accent, fontWeight: '700' },
                ]}
              >
                You
              </Text>
              <Check size={14} color={colors.accent} strokeWidth={3} />
            </View>

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
                        ? colors.accent + '15'
                        : colors.surfaceElevated,
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

          {/* Split Mode Selector (Equal vs Custom) */}
          <View style={styles.modeSelectorContainer}>
            <TouchableOpacity
              onPress={() => setSplitMethod('equal')}
              style={[
                styles.modeBtn,
                {
                  backgroundColor:
                    splitMethod === 'equal'
                      ? colors.accent
                      : colors.surfaceElevated,
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
              style={[
                styles.modeBtn,
                {
                  backgroundColor:
                    splitMethod === 'custom'
                      ? colors.accent
                      : colors.surfaceElevated,
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
                  backgroundColor: colors.surfaceElevated,
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
                  You will be owed {formatCurrency(equalShare * selectedFriendIds.length)} in total.
                </Text>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.customCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* You input */}
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
                    keyboardType="numeric"
                    value={customAmounts['you'] || ''}
                    onChangeText={(val) => handleCustomAmountChange('you', val)}
                    style={[
                      styles.customInput,
                      { color: colors.textPrimary, borderColor: colors.border },
                    ]}
                  />
                </View>
              </View>

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
                        keyboardType="numeric"
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
        <View style={styles.bottom}>
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
    borderRadius: 12,
    borderWidth: 1,
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
    paddingHorizontal: spacing.xl,
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  summaryCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
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
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
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
    paddingBottom: spacing['2xl'],
    marginTop: spacing.lg,
  },
});
