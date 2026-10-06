import { create } from 'zustand';
import type {
  Group,
  GroupMember,
  GroupExpense,
  GroupExpenseParticipant,
  GroupSettlement,
  GroupMemberBalance,
  SplitMethod,
} from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO } from '@/utils/date';
import { useFriendStore } from './friendStore';

interface GroupState {
  groups: Group[];
  groupExpenses: GroupExpense[];
  groupSettlements: GroupSettlement[];
  isLoading: boolean;

  loadGroups: () => void;
  addGroup: (data: { name: string; icon?: string; memberFriendIds: string[] }) => Group;
  updateGroup: (id: string, data: { name?: string; icon?: string }) => void;
  deleteGroup: (id: string) => void;
  addGroupMember: (groupId: string, friendId: string) => void;
  removeGroupMember: (groupId: string, friendId: string | null) => { success: boolean; message?: string };

  addGroupExpense: (data: {
    groupId: string;
    description: string;
    amount: number;
    date?: string;
    paidByFriendId: string | null;
    splitMethod: SplitMethod;
    participants: Array<{
      friendId: string | null;
      shareAmount: number;
    }>;
  }) => GroupExpense;
  updateGroupExpense: (
    expenseId: string,
    data: {
      description: string;
      amount: number;
      date: string;
      paidByFriendId: string | null;
      splitMethod: SplitMethod;
      participants: Array<{
        friendId: string | null;
        shareAmount: number;
      }>;
    }
  ) => void;
  deleteGroupExpense: (expenseId: string) => void;

  addGroupSettlement: (data: {
    groupId: string;
    fromFriendId: string | null;
    toFriendId: string | null;
    amount: number;
    date?: string;
  }) => GroupSettlement;
  deleteGroupSettlement: (settlementId: string) => void;

  getGroupById: (id: string) => Group | undefined;
  getGroupExpensesByGroupId: (groupId: string) => GroupExpense[];
  getGroupSettlementsByGroupId: (groupId: string) => GroupSettlement[];
  getGroupBalanceForMe: (groupId: string) => number;
  getGroupMemberBalances: (groupId: string) => GroupMemberBalance[];
  getGroupSummary: (groupId: string) => {
    totalExpenseAmount: number;
    totalYouPaid: number;
    yourShare: number;
    netBalance: number;
  };
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  groupExpenses: [],
  groupSettlements: [],
  isLoading: false,

  loadGroups: () => {
    try {
      const groups = repository.getGroups();
      const groupExpenses = repository.getGroupExpenses();
      const groupSettlements = repository.getGroupSettlements();
      set({ groups, groupExpenses, groupSettlements });
    } catch (e) {
      console.error('Failed to load groups data:', e);
    }
  },

  addGroup: (data) => {
    const now = getTodayISO();
    const groupId = generateId();
    const icon = data.icon?.trim() || '🏖';

    // Current user ("Me", friendId: null) is always automatically a member
    const members: GroupMember[] = [
      {
        id: generateId(),
        groupId,
        friendId: null,
        createdAt: now,
      },
    ];

    // Add selected friends
    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    for (const friendId of data.memberFriendIds) {
      if (friendId && !members.some((m) => m.friendId === friendId)) {
        members.push({
          id: generateId(),
          groupId,
          friendId,
          createdAt: now,
          friend: friendMap.get(friendId) || null,
        });
      }
    }

    const newGroup: Group = {
      id: groupId,
      name: data.name.trim(),
      icon,
      createdAt: now,
      updatedAt: now,
      members,
    };

    repository.addGroup(newGroup, members);

    set((state) => ({
      groups: [newGroup, ...state.groups],
    }));

    return newGroup;
  },

  updateGroup: (id, data) => {
    const now = getTodayISO();
    const updates: Partial<Group> = {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.icon ? { icon: data.icon.trim() } : {}),
      updatedAt: now,
    };

    repository.updateGroup(id, updates);

    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  },

  deleteGroup: (id) => {
    repository.deleteGroup(id);

    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
      groupExpenses: state.groupExpenses.filter((e) => e.groupId !== id),
      groupSettlements: state.groupSettlements.filter((s) => s.groupId !== id),
    }));
  },

  addGroupMember: (groupId, friendId) => {
    const now = getTodayISO();
    const friends = useFriendStore.getState().friends;
    const friend = friends.find((f) => f.id === friendId) || null;

    const newMember: GroupMember = {
      id: generateId(),
      groupId,
      friendId,
      createdAt: now,
      friend,
    };

    repository.addGroupMember(newMember);

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: g.members?.some((m) => m.friendId === friendId)
                ? g.members
                : [...(g.members || []), newMember],
            }
          : g
      ),
    }));
  },

  removeGroupMember: (groupId, friendId) => {
    if (friendId === null) {
      return { success: false, message: 'Cannot remove yourself from the group.' };
    }

    const { groupExpenses, groupSettlements } = get();

    // Check if this member has any existing expense involvement
    const hasExpense = groupExpenses.some(
      (e) =>
        e.groupId === groupId &&
        (e.paidByFriendId === friendId ||
          e.participants?.some((p) => p.friendId === friendId))
    );

    const hasSettlement = groupSettlements.some(
      (s) =>
        s.groupId === groupId &&
        (s.fromFriendId === friendId || s.toFriendId === friendId)
    );

    if (hasExpense || hasSettlement) {
      return {
        success: false,
        message: 'Cannot remove a member who has recorded expenses or settlements in this group.',
      };
    }

    repository.removeGroupMember(groupId, friendId);

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              members: (g.members || []).filter((m) => m.friendId !== friendId),
            }
          : g
      ),
    }));

    return { success: true };
  },

  addGroupExpense: (data) => {
    const now = getTodayISO();
    const expenseId = generateId();
    const date = data.date || now;
    const amount = Number(data.amount) || 0;

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    const participantRecords: GroupExpenseParticipant[] = data.participants.map((p) => ({
      id: generateId(),
      groupExpenseId: expenseId,
      friendId: p.friendId,
      shareAmount: Number(p.shareAmount) || 0,
      friend: p.friendId ? friendMap.get(p.friendId) || null : null,
    }));

    const newExpense: GroupExpense = {
      id: expenseId,
      groupId: data.groupId,
      description: data.description.trim(),
      amount,
      paidByFriendId: data.paidByFriendId,
      date,
      splitMethod: data.splitMethod,
      createdAt: now,
      updatedAt: now,
      participants: participantRecords,
      paidByFriend: data.paidByFriendId ? friendMap.get(data.paidByFriendId) || null : null,
    };

    repository.addGroupExpense(
      {
        id: expenseId,
        groupId: data.groupId,
        description: data.description.trim(),
        amount,
        paidByFriendId: data.paidByFriendId,
        date,
        splitMethod: data.splitMethod,
        createdAt: now,
        updatedAt: now,
      },
      participantRecords
    );

    repository.updateGroup(data.groupId, { updatedAt: now });

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === data.groupId ? { ...g, updatedAt: now } : g
      ),
      groupExpenses: [newExpense, ...state.groupExpenses],
    }));

    return newExpense;
  },

  updateGroupExpense: (expenseId, data) => {
    const now = getTodayISO();
    const amount = Number(data.amount) || 0;
    const existing = get().groupExpenses.find((e) => e.id === expenseId);

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    const participantRecords: GroupExpenseParticipant[] = data.participants.map((p) => ({
      id: generateId(),
      groupExpenseId: expenseId,
      friendId: p.friendId,
      shareAmount: Number(p.shareAmount) || 0,
      friend: p.friendId ? friendMap.get(p.friendId) || null : null,
    }));

    const updates: Partial<Omit<GroupExpense, 'participants'>> = {
      description: data.description.trim(),
      amount,
      date: data.date,
      paidByFriendId: data.paidByFriendId,
      splitMethod: data.splitMethod,
      updatedAt: now,
    };

    repository.updateGroupExpense(expenseId, updates, participantRecords);

    if (existing?.groupId) {
      repository.updateGroup(existing.groupId, { updatedAt: now });
    }

    set((state) => ({
      groups: existing?.groupId
        ? state.groups.map((g) => (g.id === existing.groupId ? { ...g, updatedAt: now } : g))
        : state.groups,
      groupExpenses: state.groupExpenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              ...updates,
              participants: participantRecords,
              paidByFriend: data.paidByFriendId ? friendMap.get(data.paidByFriendId) || null : null,
            }
          : e
      ),
    }));
  },

  deleteGroupExpense: (expenseId) => {
    const target = get().groupExpenses.find((e) => e.id === expenseId);
    const now = getTodayISO();

    repository.deleteGroupExpense(expenseId);

    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
    }

    set((state) => ({
      groups: target?.groupId
        ? state.groups.map((g) => (g.id === target.groupId ? { ...g, updatedAt: now } : g))
        : state.groups,
      groupExpenses: state.groupExpenses.filter((e) => e.id !== expenseId),
    }));
  },

  addGroupSettlement: (data) => {
    const now = getTodayISO();
    const settlementId = generateId();
    const date = data.date || now;
    const amount = Number(data.amount) || 0;

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    const newSettlement: GroupSettlement = {
      id: settlementId,
      groupId: data.groupId,
      fromFriendId: data.fromFriendId,
      toFriendId: data.toFriendId,
      amount,
      date,
      createdAt: now,
      fromFriend: data.fromFriendId ? friendMap.get(data.fromFriendId) || null : null,
      toFriend: data.toFriendId ? friendMap.get(data.toFriendId) || null : null,
    };

    repository.addGroupSettlement(newSettlement);
    repository.updateGroup(data.groupId, { updatedAt: now });

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === data.groupId ? { ...g, updatedAt: now } : g
      ),
      groupSettlements: [newSettlement, ...state.groupSettlements],
    }));

    return newSettlement;
  },

  deleteGroupSettlement: (settlementId) => {
    const target = get().groupSettlements.find((s) => s.id === settlementId);
    const now = getTodayISO();

    repository.deleteGroupSettlement(settlementId);

    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
    }

    set((state) => ({
      groups: target?.groupId
        ? state.groups.map((g) => (g.id === target.groupId ? { ...g, updatedAt: now } : g))
        : state.groups,
      groupSettlements: state.groupSettlements.filter((s) => s.id !== settlementId),
    }));
  },

  getGroupById: (id) => {
    return get().groups.find((g) => g.id === id);
  },

  getGroupExpensesByGroupId: (groupId) => {
    return get()
      .groupExpenses.filter((e) => e.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getGroupSettlementsByGroupId: (groupId) => {
    return get()
      .groupSettlements.filter((s) => s.groupId === groupId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // ─── Scoped Balance Engine ──────────────────────────────────────────
  getGroupMemberBalances: (groupId) => {
    const { groups, groupExpenses, groupSettlements } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return [];

    const expenses = groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = groupSettlements.filter((s) => s.groupId === groupId);

    const members = group.members || [];
    const memberIds = members.map((m) => m.friendId); // null or string

    // Map: friendId (or 'me') -> { paid: number, share: number, balanceWithMe: number }
    // balanceWithMe: positive = they owe Me, negative = Me owes them
    const balanceWithMeMap = new Map<string | null, number>();
    const totalPaidMap = new Map<string | null, number>();
    const totalShareMap = new Map<string | null, number>();

    for (const mId of memberIds) {
      balanceWithMeMap.set(mId, 0);
      totalPaidMap.set(mId, 0);
      totalShareMap.set(mId, 0);
    }

    // Process expenses
    for (const exp of expenses) {
      const payer = exp.paidByFriendId; // null = Me, string = Friend
      const expAmount = Number(exp.amount) || 0;
      totalPaidMap.set(payer, (totalPaidMap.get(payer) || 0) + expAmount);

      const participants = exp.participants || [];
      for (const p of participants) {
        const pId = p.friendId;
        const share = Number(p.shareAmount) || 0;
        totalShareMap.set(pId, (totalShareMap.get(pId) || 0) + share);

        // Pair-wise balance relative to Me:
        if (payer === null && pId !== null) {
          // Me paid for friend pId: friend pId owes Me +share
          const current = balanceWithMeMap.get(pId) || 0;
          balanceWithMeMap.set(pId, current + share);
        } else if (payer !== null && pId === null) {
          // Friend payer paid for Me: Me owes friend payer +share (balanceWithMe decreases by share)
          const current = balanceWithMeMap.get(payer) || 0;
          balanceWithMeMap.set(payer, current - share);
        }
      }
    }

    // Process settlements
    for (const setl of settlements) {
      const from = setl.fromFriendId;
      const to = setl.toFriendId;
      const amt = Number(setl.amount) || 0;

      // Settlement updates overall paid/received
      totalPaidMap.set(from, (totalPaidMap.get(from) || 0) + amt);
      totalShareMap.set(to, (totalShareMap.get(to) || 0) + amt);

      // Pair-wise balance relative to Me:
      if (from === null && to !== null) {
        // Me paid Friend to: reduces what Me owes them / increases balanceWithMe
        const current = balanceWithMeMap.get(to) || 0;
        balanceWithMeMap.set(to, current + amt);
      } else if (from !== null && to === null) {
        // Friend from paid Me: reduces what they owe Me / decreases balanceWithMe
        const current = balanceWithMeMap.get(from) || 0;
        balanceWithMeMap.set(from, current - amt);
      }
    }

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    return members.map((m) => {
      const mId = m.friendId;
      const paid = totalPaidMap.get(mId) || 0;
      const share = totalShareMap.get(mId) || 0;
      const overallNet = paid - share;
      const withMe = mId === null ? overallNet : balanceWithMeMap.get(mId) || 0;
      const friendObj = mId ? friendMap.get(mId) || m.friend || null : null;

      return {
        friendId: mId,
        friend: friendObj,
        name: mId === null ? 'You' : friendObj?.name || 'Friend',
        balance: overallNet,
        balanceWithMe: withMe,
      };
    });
  },

  getGroupBalanceForMe: (groupId) => {
    // Current user's net balance in the group:
    // Positive = You are owed, Negative = You owe, 0 = Settled
    const memberBalances = get().getGroupMemberBalances(groupId);
    const myBalance = memberBalances.find((m) => m.friendId === null);
    return myBalance ? myBalance.balance : 0;
  },

  getGroupSummary: (groupId) => {
    const { groupExpenses } = get();
    const expenses = groupExpenses.filter((e) => e.groupId === groupId);

    let totalExpenseAmount = 0;
    let totalYouPaid = 0;
    let yourShare = 0;

    for (const exp of expenses) {
      const amt = Number(exp.amount) || 0;
      totalExpenseAmount += amt;

      if (exp.paidByFriendId === null) {
        totalYouPaid += amt;
      }

      const myParticipant = exp.participants?.find((p) => p.friendId === null);
      if (myParticipant) {
        yourShare += Number(myParticipant.shareAmount) || 0;
      }
    }

    const netBalance = get().getGroupBalanceForMe(groupId);

    return {
      totalExpenseAmount,
      totalYouPaid,
      yourShare,
      netBalance,
    };
  },
}));
