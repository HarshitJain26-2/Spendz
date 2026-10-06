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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Trash2, Calendar } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useGroupStore } from '@/store/groupStore';
import { useAppStore } from '@/store/appStore';
import { AmountInput } from '@/components/ui/AmountInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { formatCurrency } from '@/utils/currency';
import { getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';

export default function AddOrEditGroupExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const userProfile = useAppStore((s) => s.userProfile);

  const groups = useGroupStore((s) => s.groups);
  const groupExpenses = useGroupStore((s) => s.groupExpenses);
  const addGroupExpense = useGroupStore((s) => s.addGroupExpense);
  const updateGroupExpense = useGroupStore((s) => s.updateGroupExpense);
  const deleteGroupExpense = useGroupStore((s) => s.deleteGroupExpense);

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);

  const existingExpense = useMemo(
    () => (expenseId ? groupExpenses.find((e) => e.id === expenseId) : null),
    [expenseId, groupExpenses]
  );

  const isEditing = Boolean(existingExpense);

  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [paidByFriendId, setPaidByFriendId] = useState<string | null>(null); // null = Me
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Array<string | null>>([]);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or prefill state
  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setDate(existingExpense.date);
      setPaidByFriendId(existingExpense.paidByFriendId);
      setSplitMethod(existingExpense.splitMethod);

      const participantIds = existingExpense.participants?.map((p) => p.friendId) || [];
      setSelectedParticipantIds(participantIds);

      const sharesMap: Record<string, string> = {};
      existingExpense.participants?.forEach((p) => {
        sharesMap[p.friendId === null ? 'me' : p.friendId] = String(p.shareAmount);
      });
      setCustomShares(sharesMap);
    } else if (group?.members) {
      // Default: all group members selected for split
      const allMemberIds = group.members.map((m) => m.friendId);
      setSelectedParticipantIds(allMemberIds);
      setPaidByFriendId(null); // Default paid by Me
    }
  }, [existingExpense, group]);

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Group not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const myDisplayName = userProfile.fullName || userProfile.name || 'You';
  const numericAmount = parseFloat(amount) || 0;

  // Toggle participant in split
  const toggleParticipant = (memberId: string | null) => {
    setSelectedParticipantIds((prev) => {
      const exists = prev.includes(memberId);
      if (exists) {
        if (prev.length <= 1) {
          Alert.alert('Notice', 'At least one participant must be included in the split.');
          return prev;
        }
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  // Equal split calculation
  const equalShares = useMemo(() => {
    if (splitMethod !== 'equal' || selectedParticipantIds.length === 0 || numericAmount <= 0) {
      return {};
    }
    const count = selectedParticipantIds.length;
    const baseShare = Math.floor((numericAmount / count) * 100) / 100;
    let remainder = Math.round((numericAmount - baseShare * count) * 100) / 100;

    const shares: Record<string, number> = {};
    selectedParticipantIds.forEach((mId, index) => {
      const key = mId === null ? 'me' : mId;
      // Add cent remainder to the first member
      let share = baseShare;
      if (remainder > 0) {
        share = Math.round((share + 0.01) * 100) / 100;
        remainder = Math.round((remainder - 0.01) * 100) / 100;
      }
      shares[key] = share;
    });
    return shares;
  }, [splitMethod, selectedParticipantIds, numericAmount]);

  // Custom shares calculation & validation
  const customSum = useMemo(() => {
    let sum = 0;
    selectedParticipantIds.forEach((mId) => {
      const key = mId === null ? 'me' : mId;
      const val = parseFloat(customShares[key] || '0') || 0;
      sum += val;
    });
    return Math.round(sum * 100) / 100;
  }, [selectedParticipantIds, customShares]);

  const customDifference = Math.round((numericAmount - customSum) * 100) / 100;
  const isCustomValid = Math.abs(customDifference) < 0.01;

  // Submit Handler
  const handleSubmit = () => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      setError('Please enter an expense description.');
      return;
    }

    if (numericAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setError('Please select at least one participant.');
      return;
    }

    // Build participants array
    let participantsPayload: Array<{ friendId: string | null; shareAmount: number }> = [];

    if (splitMethod === 'equal') {
      participantsPayload = selectedParticipantIds.map((mId) => {
        const key = mId === null ? 'me' : mId;
        return {
          friendId: mId,
          shareAmount: equalShares[key] || 0,
        };
      });
    } else {
      if (!isCustomValid) {
        setError(
          `Sum of shares (${formatCurrency(customSum)}) must exactly equal the total amount (${formatCurrency(numericAmount)}). Difference: ${formatCurrency(Math.abs(customDifference))}`
        );
        return;
      }

      participantsPayload = selectedParticipantIds.map((mId) => {
        const key = mId === null ? 'me' : mId;
        const val = parseFloat(customShares[key] || '0') || 0;
        return {
          friendId: mId,
          shareAmount: val,
        };
      });
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && expenseId) {
        updateGroupExpense(expenseId, {
          description: trimmedDesc,
          amount: numericAmount,
          date,
          paidByFriendId,
          splitMethod,
          participants: participantsPayload,
        });
      } else {
        addGroupExpense({
          groupId: group.id,
          description: trimmedDesc,
          amount: numericAmount,
          date,
          paidByFriendId,
          splitMethod,
          participants: participantsPayload,
        });
      }

      useGroupStore.getState().loadGroups();

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/groups/${group.id}` as any);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save group expense');
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!expenseId) return;
    Alert.alert(
      'Delete Group Expense',
      'Are you sure you want to delete this group expense? Group balances will recalculate immediately. This does NOT alter personal Spendz activity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGroupExpense(expenseId);
            useGroupStore.getState().loadGroups();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(`/groups/${group.id}` as any);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {isEditing ? 'Edit Group Expense' : 'Add Group Expense'}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Input */}
          <AmountInput
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (error) setError(null);
            }}
            placeholder="0"
            autoFocus={!isEditing}
          />

          {/* Expense Description */}
          <Input
            label="Description"
            placeholder="e.g. Dinner, Hotel, Cab, Groceries..."
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error) setError(null);
            }}
          />

          {/* Paid By Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PAID BY
            </Text>
          </View>
          <View
            style={[
              styles.payerCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.sm,
            ]}
          >
            {/* Option: Me */}
            <TouchableOpacity
              onPress={() => setPaidByFriendId(null)}
              activeOpacity={0.7}
              style={[
                styles.payerRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: (group.members?.length || 1) > 1 ? 1 : 0,
                },
              ]}
            >
              <View style={styles.payerLeft}>
                <Avatar name={myDisplayName} avatarUri={userProfile.avatarUri} size={32} />
                <Text style={[styles.payerName, { color: colors.textPrimary }]}>
                  {myDisplayName} (You)
                </Text>
              </View>
              {paidByFriendId === null && (
                <Check size={18} color={colors.accent} strokeWidth={2.5} />
              )}
            </TouchableOpacity>

            {/* Other Group Members */}
            {group.members
              ?.filter((m) => m.friendId !== null)
              .map((m, idx, arr) => {
                const isSelected = paidByFriendId === m.friendId;
                const isLast = idx === arr.length - 1;
                const friendName = m.friend?.name || 'Friend';

                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setPaidByFriendId(m.friendId)}
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
                      <Avatar
                        name={friendName}
                        color={m.friend?.avatarColor}
                        size={32}
                      />
                      <Text style={[styles.payerName, { color: colors.textPrimary }]}>
                        {friendName}
                      </Text>
                    </View>
                    {isSelected && (
                      <Check size={18} color={colors.accent} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>

          {/* Split Between Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SPLIT BETWEEN ({selectedParticipantIds.length})
            </Text>
          </View>
          <View style={styles.participantChipsRow}>
            {group.members?.map((m) => {
              const isMe = m.friendId === null;
              const isSelected = selectedParticipantIds.includes(m.friendId);
              const mName = isMe ? 'You' : m.friend?.name || 'Friend';

              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => toggleParticipant(m.friendId)}
                  activeOpacity={0.7}
                  style={[
                    styles.participantChip,
                    {
                      backgroundColor: isSelected
                        ? colors.accentLight
                        : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                    shadows.sm,
                  ]}
                >
                  <Avatar
                    name={mName}
                    avatarUri={isMe ? userProfile.avatarUri : undefined}
                    color={m.friend?.avatarColor}
                    size={24}
                  />
                  <Text
                    style={[
                      styles.participantChipText,
                      {
                        color: isSelected ? colors.accent : colors.textPrimary,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {mName}
                  </Text>
                  {isSelected && (
                    <Check size={14} color={colors.accent} strokeWidth={3} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Split Method Segmented Switcher */}
          <View
            style={[
              styles.methodSwitcher,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.sm,
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setSplitMethod('equal');
                if (error) setError(null);
              }}
              activeOpacity={0.8}
              style={[
                styles.methodBtn,
                splitMethod === 'equal' && {
                  backgroundColor: colors.accent,
                  ...shadows.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.methodBtnText,
                  {
                    color: splitMethod === 'equal' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                Split Equally
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSplitMethod('custom');
                if (error) setError(null);
              }}
              activeOpacity={0.8}
              style={[
                styles.methodBtn,
                splitMethod === 'custom' && {
                  backgroundColor: colors.accent,
                  ...shadows.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.methodBtnText,
                  {
                    color: splitMethod === 'custom' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                Custom Split
              </Text>
            </TouchableOpacity>
          </View>

          {/* Split Breakdown */}
          {splitMethod === 'equal' ? (
            /* Equal Split Breakdown Cards */
            <View
              style={[
                styles.breakdownCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                shadows.sm,
              ]}
            >
              <View style={styles.breakdownSummaryHeader}>
                <Text style={[styles.breakdownSummaryText, { color: colors.textSecondary }]}>
                  {selectedParticipantIds.length} participants •{' '}
                  {numericAmount > 0
                    ? `${formatCurrency(numericAmount / selectedParticipantIds.length)} / person`
                    : 'Enter amount'}
                </Text>
              </View>

              {selectedParticipantIds.map((mId, idx) => {
                const isMe = mId === null;
                const member = group.members?.find((m) => m.friendId === mId);
                const name = isMe ? `${myDisplayName} (You)` : member?.friend?.name || 'Friend';
                const key = isMe ? 'me' : mId!;
                const share = equalShares[key] || 0;
                const isLast = idx === selectedParticipantIds.length - 1;

                return (
                  <View
                    key={key}
                    style={[
                      styles.shareRow,
                      {
                        borderBottomColor: colors.borderLight,
                        borderBottomWidth: isLast ? 0 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.shareName, { color: colors.textPrimary }]}>
                      {name}
                    </Text>
                    <Text style={[styles.shareAmount, { color: colors.textPrimary }]}>
                      {formatCurrency(share)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            /* Custom Split Inputs */
            <View
              style={[
                styles.breakdownCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                shadows.sm,
              ]}
            >
              <View style={styles.customStatusHeader}>
                <Text style={[styles.breakdownSummaryText, { color: colors.textSecondary }]}>
                  Specify each person's exact share:
                </Text>
                <Text
                  style={[
                    styles.customDiffBadge,
                    {
                      color: isCustomValid ? colors.income : colors.expense,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {isCustomValid
                    ? '✓ Matches Total'
                    : `Diff: ${formatCurrency(Math.abs(customDifference))} ${
                        customDifference > 0 ? 'remaining' : 'over'
                      }`}
                </Text>
              </View>

              {selectedParticipantIds.map((mId) => {
                const isMe = mId === null;
                const member = group.members?.find((m) => m.friendId === mId);
                const name = isMe ? `${myDisplayName} (You)` : member?.friend?.name || 'Friend';
                const key = isMe ? 'me' : mId!;
                const currentShare = customShares[key] || '';

                return (
                  <View key={key} style={styles.customInputRow}>
                    <Text
                      style={[styles.customShareName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <View
                      style={[
                        styles.customInputBox,
                        { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                      ]}
                    >
                      <Text style={[styles.currencyPrefix, { color: colors.textTertiary }]}>
                        ₹
                      </Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textTertiary}
                        value={currentShare}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9.]/g, '');
                          setCustomShares((prev) => ({ ...prev, [key]: cleaned }));
                          if (error) setError(null);
                        }}
                        style={[styles.customShareInput, { color: colors.textPrimary }]}
                      />
                    </View>
                  </View>
                );
              })}

              <View
                style={[
                  styles.customTotalFooter,
                  { borderTopColor: colors.border, borderTopWidth: 1 },
                ]}
              >
                <Text style={[styles.customTotalLabel, { color: colors.textSecondary }]}>
                  Total Custom Shares:
                </Text>
                <Text
                  style={[
                    styles.customTotalValue,
                    { color: isCustomValid ? colors.income : colors.expense },
                  ]}
                >
                  {formatCurrency(customSum)} / {formatCurrency(numericAmount)}
                </Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, { color: colors.expense }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              title={isEditing ? 'Update Group Expense' : 'Save Group Expense'}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={
                !description.trim() ||
                numericAmount <= 0 ||
                (splitMethod === 'custom' && !isCustomValid)
              }
              fullWidth
              size="lg"
            />
          </View>

          {/* Delete Expense button if editing */}
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              style={[
                styles.deleteBtn,
                {
                  backgroundColor: colors.expenseLight,
                  borderColor: colors.expense,
                },
              ]}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={colors.expense} />
              <Text style={[styles.deleteBtnText, { color: colors.expense }]}>
                Delete Group Expense
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  payerCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
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
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
  },
  participantChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  participantChipText: {
    fontSize: 13,
  },
  methodSwitcher: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 4,
    marginBottom: spacing.md,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodBtnText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  breakdownCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  breakdownSummaryHeader: {
    marginBottom: spacing.sm,
  },
  breakdownSummaryText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  shareName: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
  },
  shareAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  customStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customDiffBadge: {
    fontSize: 12,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  customShareName: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
    marginRight: spacing.md,
  },
  customInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    width: 100,
    height: 36,
  },
  currencyPrefix: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
    marginRight: 4,
  },
  customShareInput: {
    flex: 1,
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
    padding: 0,
    textAlign: 'right',
  },
  customTotalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  customTotalLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  customTotalValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  errorBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  deleteBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
});
