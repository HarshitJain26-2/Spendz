import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  ArrowLeft,
  Settings,
  Plus,
  HandCoins,
  Receipt,
  Users,
  Calendar,
  X,
  Trash2,
  Edit2,
  Check,
  ArrowRight,
  UserPlus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useGroupStore,
  calculateGroupSummary,
  calculateGroupMemberBalances,
} from '@/store/groupStore';
import { useFriendStore } from '@/store/friendStore';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { GroupBalanceSummary, type GroupMemberBalanceItem } from '@/components/groups/GroupBalanceSummary';
import { formatCurrency } from '@/utils/currency';
import { formatRelativeDate, getTodayISO } from '@/utils/date';
import { typography } from '@/theme/typography';
import { spacing, borderRadius, shadows } from '@/theme/spacing';
import type { GroupExpense, GroupSettlement } from '@/types';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const userProfile = useAppStore((s) => s.userProfile);
  const authUser = useAuthStore((s) => s.user);
  const currentUserId = authUser?.id || (userProfile.id !== 'user_spendz' ? userProfile.id : null);

  // Group store selectors (stable state slices)
  const groups = useGroupStore((s) => s.groups);
  const groupExpenses = useGroupStore((s) => s.groupExpenses);
  const groupSettlements = useGroupStore((s) => s.groupSettlements);
  const friends = useFriendStore((s) => s.friends);
  const deleteGroupExpense = useGroupStore((s) => s.deleteGroupExpense);
  const addGroupSettlement = useGroupStore((s) => s.addGroupSettlement);
  const deleteGroupSettlement = useGroupStore((s) => s.deleteGroupSettlement);

  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  // Initial hydration from Supabase & Realtime subscription
  useEffect(() => {
    if (!id) return;
    useGroupStore.getState().loadGroupFromSupabase(id);

    const unsubscribe = useGroupStore.getState().subscribeToGroupRealtime(id);
    return () => {
      unsubscribe();
    };
  }, [id]);

  const onRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await useGroupStore.getState().loadGroupFromSupabase(id);
    setRefreshing(false);
  }, [id]);

  const group = useMemo(() => groups.find((g) => g.id === id), [groups, id]);

  const isMemberMe = useCallback(
    (m?: any | null) => {
      if (!m) return false;
      if (currentUserId && m.userId && m.userId === currentUserId) return true;
      if (!currentUserId && m.friendId === null) return true;
      return false;
    },
    [currentUserId]
  );

  const meMember = useMemo(
    () => group?.members?.find((m) => isMemberMe(m)) || null,
    [group?.members, isMemberMe]
  );

  const [activeTab, setActiveTab] = useState<'expenses' | 'members'>('expenses');

  // Detail Modal for an Expense
  const [selectedExpense, setSelectedExpense] = useState<GroupExpense | null>(null);

  // Settle Up Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePayerId, setSettlePayerId] = useState<string | null>(null); // null = Me
  const [settleReceiverId, setSettleReceiverId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');

  // Expenses & Settlements for this group (Single Source of Truth)
  const expenses = useMemo(
    () =>
      groupExpenses
        .filter((e) => e.groupId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [groupExpenses, id]
  );

  const settlements = useMemo(
    () =>
      groupSettlements
        .filter((s) => s.groupId === id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [groupSettlements, id]
  );

  // Combined timeline items
  type TimelineItem =
    | { type: 'expense'; data: GroupExpense; date: string }
    | { type: 'settlement'; data: GroupSettlement; date: string };

  const timelineItems = useMemo(() => {
    const list: TimelineItem[] = [
      ...expenses.map((e) => ({ type: 'expense' as const, data: e, date: e.date })),
      ...settlements.map((s) => ({ type: 'settlement' as const, data: s, date: s.date })),
    ];
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, settlements]);

  // Derived Group Summary (Live Single Source of Truth)
  const groupSummary = useMemo(
    () => calculateGroupSummary(expenses, settlements, currentUserId),
    [expenses, settlements, currentUserId]
  );

  const netBalanceForMe = groupSummary.netBalance;

  // Derived Member Balances (Live Single Source of Truth)
  const memberBalances = useMemo(
    () =>
      group
        ? calculateGroupMemberBalances(
            group,
            expenses,
            settlements,
            friends,
            currentUserId
          )
        : [],
    [group, expenses, settlements, friends, currentUserId]
  );

  // Aggregate what you owe / are owed by members in this group
  const { groupMemberYouOwe, groupMemberOwedToYou, groupMemberBreakdown } = useMemo(() => {
    let owe = 0;
    let owed = 0;
    const breakdown: GroupMemberBalanceItem[] = [];

    for (const mb of memberBalances) {
      if (mb.isMe) continue; // skip current user ("You")
      const bal = mb.balanceWithMe;
      if (bal !== 0) {
        breakdown.push({
          id: mb.memberId || mb.friendId || mb.userId || mb.name,
          name: mb.name,
          memberId: mb.memberId,
          userId: mb.userId,
          friendId: mb.friendId,
          balance: bal,
        });
        if (bal > 0) {
          owed += bal;
        } else if (bal < 0) {
          owe += Math.abs(bal);
        }
      }
    }

    breakdown.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    return {
      groupMemberYouOwe: owe,
      groupMemberOwedToYou: owed,
      groupMemberBreakdown: breakdown,
    };
  }, [memberBalances]);

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

  const handleDeleteExpenseConfirm = (expenseId: string) => {
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
            setSelectedExpense(null);
          },
        },
      ]
    );
  };

  const handleDeleteSettlementConfirm = (settlementId: string) => {
    Alert.alert(
      'Delete Settlement',
      'Are you sure you want to delete this group settlement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteGroupSettlement(settlementId);
          },
        },
      ]
    );
  };

  // Open Settle Up modal pre-filled for a specific member
  const openSettleForMember = (mb: any, balanceWithMe: number) => {
    const targetMember = group.members?.find((m) =>
      m.id === mb.memberId ||
      (mb.userId && m.userId === mb.userId) ||
      (mb.friendId && m.friendId === mb.friendId)
    );
    const targetId = targetMember?.id || mb.memberId || mb.friendId;

    if (balanceWithMe < 0) {
      // Me owes Target -> Payer is Me (null), Receiver is Target
      setSettlePayerId(null);
      setSettleReceiverId(targetId);
      setSettleAmount(String(Math.abs(balanceWithMe)));
    } else if (balanceWithMe > 0) {
      // Target owes Me -> Payer is Target, Receiver is Me (null)
      setSettlePayerId(targetId);
      setSettleReceiverId(null);
      setSettleAmount(String(balanceWithMe));
    }
    setIsSettleModalOpen(true);
  };

  const handleRecordSettlement = () => {
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive settlement amount.');
      return;
    }

    if (settlePayerId === settleReceiverId) {
      Alert.alert('Invalid Settlement', 'Payer and receiver cannot be the same person.');
      return;
    }

    const payerMember = settlePayerId
      ? group.members?.find((m) => m.id === settlePayerId || m.friendId === settlePayerId)
      : meMember;

    const receiverMember = settleReceiverId
      ? group.members?.find((m) => m.id === settleReceiverId || m.friendId === settleReceiverId)
      : meMember;

    addGroupSettlement({
      groupId: group.id,
      fromMemberId: payerMember?.id || null,
      fromUserId: payerMember?.userId || (isMemberMe(payerMember) ? currentUserId : null),
      fromFriendId: payerMember?.friendId || null,
      toMemberId: receiverMember?.id || null,
      toUserId: receiverMember?.userId || (isMemberMe(receiverMember) ? currentUserId : null),
      toFriendId: receiverMember?.friendId || null,
      amount: amt,
      date: getTodayISO(),
    });

    setIsSettleModalOpen(false);
    setSettleAmount('');
  };

  const myDisplayName = userProfile.fullName || userProfile.name || 'You';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.groupHeaderIcon}>{group.icon || '🏖'}</Text>
          <Text
            style={[styles.headerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => router.push(`/groups/invite?groupId=${group.id}` as any)}
            style={[
              styles.inviteHeaderBtn,
              {
                backgroundColor: colors.accentLight,
                borderColor: colors.accent,
              },
            ]}
            activeOpacity={0.7}
          >
            <UserPlus size={15} color={colors.accent} strokeWidth={2.4} />
            <Text style={[styles.inviteHeaderBtnText, { color: colors.textPrimary }]}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/groups/${group.id}/edit` as any)}
            style={[styles.backBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Settings size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Overview Balance Card */}
        <View
          style={[
            styles.balanceBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.sm,
          ]}
        >
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceBadgeContainer}>
              <Text style={styles.bannerEmoji}>{group.icon || '🏖'}</Text>
              <View>
                <Text style={[styles.bannerGroupName, { color: colors.textPrimary }]}>
                  {group.name}
                </Text>
                <Text style={[styles.bannerMemberCount, { color: colors.textSecondary }]}>
                  {group.members?.length || 1} members
                </Text>
              </View>
            </View>

            {/* Current Net Balance for You */}
            <View style={styles.balanceStatusBox}>
              <Text style={[styles.balanceStatusLabel, { color: colors.textTertiary }]}>
                YOUR BALANCE
              </Text>
              <Text
                style={[
                  styles.balanceStatusValue,
                  {
                    color:
                      netBalanceForMe > 0
                        ? colors.income
                        : netBalanceForMe < 0
                        ? colors.expense
                        : colors.textSecondary,
                  },
                ]}
              >
                {netBalanceForMe > 0
                  ? `+${formatCurrency(netBalanceForMe)}`
                  : netBalanceForMe < 0
                  ? `-${formatCurrency(Math.abs(netBalanceForMe))}`
                  : 'Settled'}
              </Text>
              <Text
                style={[
                  styles.balanceSubText,
                  {
                    color:
                      netBalanceForMe > 0
                        ? colors.income
                        : netBalanceForMe < 0
                        ? colors.expense
                        : colors.textTertiary,
                  },
                ]}
              >
                {netBalanceForMe > 0
                  ? 'You are owed'
                  : netBalanceForMe < 0
                  ? 'You owe'
                  : 'All settled up'}
              </Text>
            </View>
          </View>

          {/* Quick Metrics Divider */}
          <View style={[styles.bannerDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Total Expenses
              </Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {formatCurrency(groupSummary?.totalExpenseAmount || 0)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                You Paid
              </Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {formatCurrency(groupSummary?.totalYouPaid || 0)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Your Share
              </Text>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {formatCurrency(groupSummary?.yourShare || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons: Add Expense & Settle Up */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            onPress={() => router.push(`/groups/${group.id}/add-expense` as any)}
            activeOpacity={0.8}
            style={[
              styles.primaryActionBtn,
              { backgroundColor: colors.accent },
              shadows.sm,
            ]}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              // Pre-fill default payer / receiver
              const nonZeroMember = memberBalances.find(
                (m) => !m.isMe && m.balanceWithMe !== 0
              );
              if (nonZeroMember) {
                openSettleForMember(nonZeroMember, nonZeroMember.balanceWithMe);
              } else {
                setSettlePayerId(null);
                const firstOther = group.members?.find((m) => !isMemberMe(m));
                setSettleReceiverId(firstOther?.id || null);
                setSettleAmount('');
                setIsSettleModalOpen(true);
              }
            }}
            activeOpacity={0.8}
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.sm,
            ]}
          >
            <HandCoins size={18} color={colors.accent} strokeWidth={2.2} />
            <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
              Settle Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Member Balance Summary (Settled vs Debts) */}
        <GroupBalanceSummary
          totalYouOwe={groupMemberYouOwe}
          totalOwedToYou={groupMemberOwedToYou}
          breakdown={groupMemberBreakdown}
          emptyNote="No pending debts or credits in this group."
          onMemberPress={(item) => {
            openSettleForMember(item, item.balance);
          }}
        />

        {/* Sub-tab Switcher: [ Expenses ] [ Members ] */}
        <View
          style={[
            styles.tabSwitcher,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.sm,
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('expenses')}
            activeOpacity={0.8}
            style={[
              styles.tabBtn,
              activeTab === 'expenses' && {
                backgroundColor: colors.accent,
                ...shadows.sm,
              },
            ]}
          >
            <Receipt
              size={15}
              color={activeTab === 'expenses' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'expenses' ? '#FFFFFF' : colors.textSecondary,
                  fontFamily:
                    activeTab === 'expenses'
                      ? typography.fontFamily.semiBold
                      : typography.fontFamily.medium,
                },
              ]}
            >
              Expenses ({expenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('members')}
            activeOpacity={0.8}
            style={[
              styles.tabBtn,
              activeTab === 'members' && {
                backgroundColor: colors.accent,
                ...shadows.sm,
              },
            ]}
          >
            <Users
              size={15}
              color={activeTab === 'members' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'members' ? '#FFFFFF' : colors.textSecondary,
                  fontFamily:
                    activeTab === 'members'
                      ? typography.fontFamily.semiBold
                      : typography.fontFamily.medium,
                },
              ]}
            >
              Members ({group.members?.length || 1})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: EXPENSES & TIMELINE */}
        {activeTab === 'expenses' && (
          <View style={styles.tabContent}>
            {timelineItems.length === 0 ? (
              <EmptyState
                title="No group expenses yet"
                description="Add your first group expense to start splitting with members."
                actionLabel="+ Add Expense"
                onAction={() => router.push(`/groups/${group.id}/add-expense` as any)}
              />
            ) : (
              timelineItems.map((item) => {
                if (item.type === 'expense') {
                  const exp = item.data;
                  const isMePayer = Boolean(
                    (currentUserId && exp.paidByUserId && exp.paidByUserId === currentUserId) ||
                    (!currentUserId && exp.paidByFriendId === null)
                  );
                  let payerName = 'Member';
                  if (isMePayer) {
                    payerName = 'You';
                  } else if (exp.paidByUserId) {
                    const mem = group.members?.find((m) => m.userId === exp.paidByUserId);
                    payerName = mem?.name || 'Member';
                  } else if (exp.paidByMemberId) {
                    const mem = group.members?.find((m) => m.id === exp.paidByMemberId);
                    payerName = mem?.name || 'Member';
                  } else if (exp.paidByFriend?.name) {
                    payerName = exp.paidByFriend.name;
                  } else if (exp.paidByFriendId) {
                    const mem = group.members?.find((m) => m.friendId === exp.paidByFriendId);
                    payerName = mem?.name || 'Member';
                  }

                  const myParticipant = exp.participants?.find((p) =>
                    (currentUserId && p.userId && p.userId === currentUserId) ||
                    (!currentUserId && p.friendId === null)
                  );
                  const myShare = myParticipant
                    ? Number(myParticipant.shareAmount) || 0
                    : 0;

                  return (
                    <TouchableOpacity
                      key={exp.id}
                      onPress={() => setSelectedExpense(exp)}
                      activeOpacity={0.7}
                      style={[
                        styles.expenseCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        shadows.sm,
                      ]}
                    >
                      <View style={styles.expenseMain}>
                        <View
                          style={[
                            styles.expenseIconBox,
                            { backgroundColor: colors.accentLight },
                          ]}
                        >
                          <Receipt size={20} color={colors.accent} />
                        </View>

                        <View style={styles.expenseDetails}>
                          <Text
                            style={[
                              styles.expenseDescription,
                              { color: colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {exp.description}
                          </Text>
                          <Text
                            style={[
                              styles.expenseSubtext,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Paid by <Text style={{ fontWeight: '600' }}>{payerName}</Text> • {formatRelativeDate(exp.date)}
                          </Text>
                        </View>

                        <View style={styles.expenseRight}>
                          <Text
                            style={[
                              styles.expenseTotal,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {formatCurrency(exp.amount)}
                          </Text>
                          <Text
                            style={[
                              styles.expenseShareText,
                              {
                                color: isMePayer
                                  ? colors.income
                                  : myShare > 0
                                  ? colors.expense
                                  : colors.textTertiary,
                              },
                            ]}
                          >
                            {isMePayer
                              ? `You paid`
                              : myShare > 0
                              ? `Your share: ${formatCurrency(myShare)}`
                              : 'Not involved'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  // Settlement record
                  const setl = item.data;
                  const fromMe = Boolean(
                    (currentUserId && setl.fromUserId && setl.fromUserId === currentUserId) ||
                    (!currentUserId && setl.fromFriendId === null)
                  );
                  const toMe = Boolean(
                    (currentUserId && setl.toUserId && setl.toUserId === currentUserId) ||
                    (!currentUserId && setl.toFriendId === null)
                  );

                  const getPartyName = (uId?: string | null, mId?: string | null, fId?: string | null, fObj?: any) => {
                    if (currentUserId && uId && uId === currentUserId) return 'You';
                    if (!currentUserId && fId === null) return 'You';
                    if (uId) {
                      const m = group.members?.find((gm) => gm.userId === uId);
                      if (m?.name) return m.name;
                    }
                    if (mId) {
                      const m = group.members?.find((gm) => gm.id === mId);
                      if (m?.name) return m.name;
                    }
                    if (fObj?.name) return fObj.name;
                    if (fId) {
                      const m = group.members?.find((gm) => gm.friendId === fId);
                      if (m?.name) return m.name;
                    }
                    return 'Member';
                  };

                  const fromName = fromMe ? 'You' : getPartyName(setl.fromUserId, setl.fromMemberId, setl.fromFriendId, setl.fromFriend);
                  const toName = toMe ? 'You' : getPartyName(setl.toUserId, setl.toMemberId, setl.toFriendId, setl.toFriend);

                  return (
                    <View
                      key={setl.id}
                      style={[
                        styles.settlementCard,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.settlementLeft}>
                        <View
                          style={[
                            styles.settlementIconBox,
                            { backgroundColor: colors.incomeLight },
                          ]}
                        >
                          <Check size={16} color={colors.income} strokeWidth={2.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.settlementTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Settlement: {fromName} → {toName}
                          </Text>
                          <Text
                            style={[
                              styles.settlementDate,
                              { color: colors.textTertiary },
                            ]}
                          >
                            {formatRelativeDate(setl.date)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.settlementRight}>
                        <Text
                          style={[
                            styles.settlementAmount,
                            { color: colors.income },
                          ]}
                        >
                          {formatCurrency(setl.amount)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteSettlementConfirm(setl.id)}
                          style={{ padding: 4 }}
                        >
                          <Trash2 size={14} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
              })
            )}
          </View>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            <View
              style={[
                styles.membersCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                shadows.sm,
              ]}
            >
              {memberBalances.map((mb, idx) => {
                const isMe = Boolean(mb.isMe);
                const isLast = idx === memberBalances.length - 1;
                const balanceWithMe = mb.balanceWithMe;

                return (
                  <View
                    key={mb.memberId || mb.userId || mb.friendId || `mem-${idx}`}
                    style={[
                      styles.memberRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: isLast ? 0 : 1,
                      },
                    ]}
                  >
                    <Avatar
                      name={isMe ? myDisplayName : mb.name}
                      avatarUri={isMe ? userProfile.avatarUri : undefined}
                      color={mb.friend?.avatarColor}
                      size={40}
                    />

                    <View style={styles.memberInfo}>
                      <Text
                        style={[styles.memberName, { color: colors.textPrimary }]}
                      >
                        {isMe ? `${myDisplayName} (You)` : mb.name}
                      </Text>

                      {isMe ? (
                        <Text
                          style={[
                            styles.memberStatusText,
                            {
                              color:
                                netBalanceForMe > 0
                                  ? colors.income
                                  : netBalanceForMe < 0
                                  ? colors.expense
                                  : colors.textTertiary,
                            },
                          ]}
                        >
                          {netBalanceForMe > 0
                            ? `You are owed ${formatCurrency(netBalanceForMe)} overall`
                            : netBalanceForMe < 0
                            ? `You owe ${formatCurrency(Math.abs(netBalanceForMe))} overall`
                            : 'Settled'}
                        </Text>
                      ) : (
                        <Text
                          style={[
                            styles.memberStatusText,
                            {
                              color:
                                balanceWithMe > 0
                                  ? colors.income
                                  : balanceWithMe < 0
                                  ? colors.expense
                                  : colors.textTertiary,
                            },
                          ]}
                        >
                          {balanceWithMe > 0
                            ? `Owes you ${formatCurrency(balanceWithMe)}`
                            : balanceWithMe < 0
                            ? `You owe ${formatCurrency(Math.abs(balanceWithMe))}`
                            : 'Settled'}
                        </Text>
                      )}
                    </View>

                    {/* Settle shortcut for non-me member with non-zero balance */}
                    {!isMe && balanceWithMe !== 0 && (
                      <TouchableOpacity
                        onPress={() => openSettleForMember(mb, balanceWithMe)}
                        style={[
                          styles.inlineSettleBtn,
                          {
                            backgroundColor: colors.accentLight,
                            borderColor: colors.accent,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.inlineSettleText,
                            { color: colors.textPrimary },
                          ]}
                        >
                          Settle
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Invite to Group Button */}
            <TouchableOpacity
              onPress={() => router.push(`/groups/invite?groupId=${group.id}` as any)}
              style={[
                styles.inviteMembersBtn,
                {
                  backgroundColor: colors.accentLight,
                  borderColor: colors.accent,
                },
              ]}
              activeOpacity={0.7}
            >
              <UserPlus size={16} color={colors.accent} strokeWidth={2.4} />
              <Text style={[styles.inviteMembersText, { color: colors.textPrimary }]}>
                Invite Members (Code & QR)
              </Text>
            </TouchableOpacity>

            {/* Manage Group Button */}
            <TouchableOpacity
              onPress={() => router.push(`/groups/${group.id}/edit` as any)}
              style={[
                styles.manageGroupBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Settings size={16} color={colors.textSecondary} />
              <Text
                style={[styles.manageGroupText, { color: colors.textSecondary }]}
              >
                Add or Remove Group Members
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ─── EXPENSE DETAILS MODAL ────────────────────────────────────── */}
      <Modal
        visible={Boolean(selectedExpense)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedExpense(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.lg,
            ]}
          >
            {selectedExpense && (
              <>
                <View style={styles.modalHeader}>
                  <Text
                    style={[styles.modalTitle, { color: colors.textPrimary }]}
                  >
                    Group Expense Details
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedExpense(null)}>
                    <X size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* Expense Amount & Description */}
                <View style={styles.modalAmountBox}>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                    {selectedExpense.description}
                  </Text>
                  <Text style={[styles.modalAmount, { color: colors.textPrimary }]}>
                    {formatCurrency(selectedExpense.amount)}
                  </Text>
                  <Text style={[styles.modalDate, { color: colors.textTertiary }]}>
                    {formatRelativeDate(selectedExpense.date)}
                  </Text>
                </View>

                {/* Paid By Info */}
                <View
                  style={[
                    styles.infoRow,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.infoRowLabel, { color: colors.textSecondary }]}>
                    Paid by:
                  </Text>
                  <Text style={[styles.infoRowValue, { color: colors.textPrimary }]}>
                    {(() => {
                      const isMe = Boolean(
                        (currentUserId && selectedExpense.paidByUserId && selectedExpense.paidByUserId === currentUserId) ||
                        (!currentUserId && selectedExpense.paidByFriendId === null)
                      );
                      if (isMe) return 'You';
                      if (selectedExpense.paidByUserId) {
                        const m = group.members?.find((gm) => gm.userId === selectedExpense.paidByUserId);
                        if (m?.name) return m.name;
                      }
                      if (selectedExpense.paidByMemberId) {
                        const m = group.members?.find((gm) => gm.id === selectedExpense.paidByMemberId);
                        if (m?.name) return m.name;
                      }
                      if (selectedExpense.paidByFriend?.name) return selectedExpense.paidByFriend.name;
                      if (selectedExpense.paidByFriendId) {
                        const m = group.members?.find((gm) => gm.friendId === selectedExpense.paidByFriendId);
                        if (m?.name) return m.name;
                      }
                      return 'Member';
                    })()}
                  </Text>
                </View>

                {/* Participants Shares Breakdown */}
                <Text style={[styles.sharesHeader, { color: colors.textSecondary }]}>
                  PARTICIPANTS & SHARES ({selectedExpense.splitMethod.toUpperCase()})
                </Text>
                <ScrollView
                  style={{ maxHeight: 180 }}
                  showsVerticalScrollIndicator={false}
                >
                  {selectedExpense.participants?.map((p) => {
                    const isMe = Boolean(
                      (currentUserId && p.userId && p.userId === currentUserId) ||
                      (!currentUserId && p.friendId === null)
                    );
                    let pName = 'Member';
                    if (isMe) {
                      pName = 'You';
                    } else if (p.userId) {
                      const m = group.members?.find((gm) => gm.userId === p.userId);
                      pName = m?.name || 'Member';
                    } else if (p.memberId) {
                      const m = group.members?.find((gm) => gm.id === p.memberId);
                      pName = m?.name || 'Member';
                    } else if (p.friend?.name) {
                      pName = p.friend.name;
                    } else if (p.friendId) {
                      const m = group.members?.find((gm) => gm.friendId === p.friendId);
                      pName = m?.name || 'Member';
                    }
                    return (
                      <View
                        key={p.id}
                        style={[
                          styles.participantShareRow,
                          { borderBottomColor: colors.borderLight, borderBottomWidth: 1 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.participantName,
                            { color: colors.textPrimary },
                            isMe && { fontWeight: '600' },
                          ]}
                        >
                          {pName} {isMe ? '(Me)' : ''}
                        </Text>
                        <Text
                          style={[
                            styles.participantShareAmount,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {formatCurrency(p.shareAmount)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Modal Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      const expId = selectedExpense.id;
                      setSelectedExpense(null);
                      router.push(
                        `/groups/${group.id}/add-expense?expenseId=${expId}` as any
                      );
                    }}
                    style={[
                      styles.modalBtn,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color={colors.accent} />
                    <Text style={[styles.modalBtnText, { color: colors.accent }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteExpenseConfirm(selectedExpense.id)}
                    style={[
                      styles.modalBtn,
                      {
                        backgroundColor: colors.expenseLight,
                        borderColor: colors.expense,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color={colors.expense} />
                    <Text style={[styles.modalBtnText, { color: colors.expense }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── SETTLE UP MODAL ─────────────────────────────────────────── */}
      <Modal
        visible={isSettleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSettleModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.lg,
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Record Group Settlement
              </Text>
              <TouchableOpacity onPress={() => setIsSettleModalOpen(false)}>
                <X size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.settleNotice,
                { color: colors.textTertiary },
              ]}
            >
              Settlements only update group balances. No personal bank or Spendz transactions will be affected.
            </Text>

            {/* Payer Selector */}
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
              WHO IS PAYING?
            </Text>
            <View style={styles.payerPickerWrap}>
              {/* Me */}
              <TouchableOpacity
                onPress={() => setSettlePayerId(null)}
                style={[
                  styles.payerChip,
                  {
                    backgroundColor:
                      settlePayerId === null ? colors.accentLight : colors.surfaceElevated,
                    borderColor:
                      settlePayerId === null ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.payerChipText,
                    {
                      color:
                        settlePayerId === null ? colors.accent : colors.textPrimary,
                    },
                  ]}
                >
                  You (Me)
                </Text>
              </TouchableOpacity>

              {/* Other members */}
              {group.members
                ?.filter((m) => !isMemberMe(m))
                .map((m) => {
                  const isSelected = settlePayerId === m.id;
                  const memberName = m.name || m.friend?.name || 'Member';
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setSettlePayerId(m.id)}
                      style={[
                        styles.payerChip,
                        {
                          backgroundColor: isSelected
                            ? colors.accentLight
                            : colors.surfaceElevated,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.payerChipText,
                          {
                            color: isSelected
                              ? colors.accent
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {memberName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            {/* Receiver Selector */}
            <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
              WHO IS RECEIVING?
            </Text>
            <View style={styles.payerPickerWrap}>
              {/* Me */}
              <TouchableOpacity
                onPress={() => setSettleReceiverId(null)}
                style={[
                  styles.payerChip,
                  {
                    backgroundColor:
                      settleReceiverId === null
                        ? colors.accentLight
                        : colors.surfaceElevated,
                    borderColor:
                      settleReceiverId === null ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.payerChipText,
                    {
                      color:
                        settleReceiverId === null
                          ? colors.accent
                          : colors.textPrimary,
                    },
                  ]}
                >
                  You (Me)
                </Text>
              </TouchableOpacity>

              {/* Other members */}
              {group.members
                ?.filter((m) => !isMemberMe(m))
                .map((m) => {
                  const isSelected = settleReceiverId === m.id;
                  const memberName = m.name || m.friend?.name || 'Member';
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setSettleReceiverId(m.id)}
                      style={[
                        styles.payerChip,
                        {
                          backgroundColor: isSelected
                            ? colors.accentLight
                            : colors.surfaceElevated,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.payerChipText,
                          {
                            color: isSelected
                              ? colors.accent
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {memberName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            {/* Amount Input */}
            <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: spacing.md }]}>
              SETTLEMENT AMOUNT (₹)
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              value={settleAmount}
              onChangeText={setSettleAmount}
              style={[
                styles.settleInput,
                { color: colors.textPrimary, borderColor: colors.border },
              ]}
            />

            {/* Submit button */}
            <View style={{ marginTop: spacing.lg }}>
              <Button
                title="Record Settlement"
                onPress={handleRecordSettlement}
                disabled={!settleAmount || parseFloat(settleAmount) <= 0}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  inviteHeaderBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 13,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: '65%',
  },
  groupHeaderIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  balanceBanner: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  bannerEmoji: {
    fontSize: 34,
  },
  bannerGroupName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  bannerMemberCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  balanceStatusBox: {
    alignItems: 'flex-end',
  },
  balanceStatusLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  balanceStatusValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    lineHeight: 22,
  },
  balanceSubText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    marginTop: 1,
  },
  bannerDivider: {
    height: 1,
    marginVertical: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    marginBottom: 2,
  },
  metricValue: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  secondaryActionText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: 4,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabBtnText: {
    fontSize: 14,
  },
  tabContent: {
    marginTop: spacing.xs,
  },
  expenseCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  expenseMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  expenseIconBox: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  expenseDescription: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 2,
  },
  expenseSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseTotal: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    lineHeight: 19,
    marginBottom: 2,
  },
  expenseShareText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
  },
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  settlementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settlementIconBox: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementTitle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  settlementDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    marginTop: 2,
  },
  settlementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settlementAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  membersCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  memberStatusText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  inlineSettleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  inlineSettleText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 12,
  },
  inviteMembersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  inviteMembersText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  manageGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  manageGroupText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: '100%',
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
  },
  modalAmountBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  modalDesc: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    marginBottom: 4,
  },
  modalAmount: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
  },
  modalDate: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  infoRowLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 14,
  },
  infoRowValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
  },
  sharesHeader: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  participantShareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  participantName: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
  },
  participantShareAmount: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.sm,
  },
  modalBtnText: {
    fontFamily: typography.fontFamily.semiBold,
    fontSize: 14,
  },
  settleNotice: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  formLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  payerPickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  payerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  payerChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 13,
  },
  settleInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    fontFamily: typography.fontFamily.semiBold,
  },
});
