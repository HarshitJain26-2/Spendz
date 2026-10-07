import { create } from 'zustand';
import type {
  Group,
  GroupMember,
  GroupInvite,
  GroupExpense,
  GroupExpenseParticipant,
  GroupSettlement,
  GroupMemberBalance,
  SplitMethod,
} from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO } from '@/utils/date';
import { generateInviteCode } from '@/utils/inviteCode';
import { useFriendStore } from './friendStore';
import { useAppStore } from './appStore';
import { useAuthStore } from './authStore';

export type InviteValidationResult =
  | { status: 'valid'; invite: GroupInvite; group: Group; memberNames: string[] }
  | { status: 'invalid'; message: string }
  | { status: 'inactive'; message: string }
  | { status: 'expired'; message: string }
  | { status: 'group_deleted'; message: string }
  | { status: 'already_member'; group: Group; memberNames: string[]; message: string };

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

  // Group Invites & Joining
  getOrCreateInvite: (groupId: string) => GroupInvite;
  getInviteByCode: (code: string) => GroupInvite | null;
  revokeInvite: (inviteId: string) => void;
  validateInvite: (code: string) => InviteValidationResult;
  joinGroupByCode: (code: string) => { success: boolean; message: string; group?: Group };
  refreshGroupMembers: (groupId: string) => void;
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

    // Always immediately re-synchronize store with repository so Zustand state matches database
    get().loadGroups();

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

    get().loadGroups();
  },

  deleteGroupExpense: (expenseId) => {
    const target = get().groupExpenses.find((e) => e.id === expenseId);
    const now = getTodayISO();

    repository.deleteGroupExpense(expenseId);

    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
    }

    get().loadGroups();
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

    get().loadGroups();

    return newSettlement;
  },

  deleteGroupSettlement: (settlementId) => {
    const target = get().groupSettlements.find((s) => s.id === settlementId);
    const now = getTodayISO();

    repository.deleteGroupSettlement(settlementId);

    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
    }

    get().loadGroups();
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

    const rawMembers = group.members || [];
    const hasMe = rawMembers.some((m) => m.friendId === null);
    const members: GroupMember[] = hasMe
      ? rawMembers
      : [{ id: `me-${groupId}`, groupId, friendId: null, createdAt: group.createdAt }, ...rawMembers];
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
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = currentProfile.id || useAuthStore.getState().user?.id;

    return members.map((m) => {
      const mId = m.friendId;
      const paid = totalPaidMap.get(mId) || 0;
      const share = totalShareMap.get(mId) || 0;
      const overallNet = paid - share;
      const withMe = mId === null ? overallNet : balanceWithMeMap.get(mId) || 0;
      const friendObj = mId ? friendMap.get(mId) || m.friend || null : null;

      const isMe = mId === null && (!m.userId || m.userId === currentUserId);
      const displayName = isMe ? 'You' : m.name || friendObj?.name || 'Member';

      return {
        friendId: mId,
        friend: friendObj,
        name: displayName,
        balance: overallNet,
        balanceWithMe: withMe,
      };
    });
  },

  getGroupBalanceForMe: (groupId) => {
    // Current user's net balance in the group:
    // Positive = You are owed, Negative = You owe, 0 = Settled
    const { groupExpenses, groupSettlements } = get();
    const expenses = groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = groupSettlements.filter((s) => s.groupId === groupId);

    let totalPaidByMe = 0;
    let totalMyShare = 0;

    for (const exp of expenses) {
      if (exp.paidByFriendId === null) {
        totalPaidByMe += Number(exp.amount) || 0;
      }
      const myPart = exp.participants?.find((p) => p.friendId === null);
      if (myPart) {
        totalMyShare += Number(myPart.shareAmount) || 0;
      }
    }

    for (const setl of settlements) {
      const amt = Number(setl.amount) || 0;
      if (setl.fromFriendId === null) {
        totalPaidByMe += amt;
      }
      if (setl.toFriendId === null) {
        totalMyShare += amt;
      }
    }

    return Math.round((totalPaidByMe - totalMyShare) * 100) / 100;
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

  // ─── Group Invites & Joining ──────────────────────────────────────────
  getOrCreateInvite: (groupId) => {
    const group = get().getGroupById(groupId) || repository.getGroups().find((g) => g.id === groupId);
    const activeInvite = repository.getActiveInviteByGroupId(groupId);
    if (activeInvite) {
      return activeInvite;
    }

    const currentProfile = useAppStore.getState().userProfile;
    const authUser = useAuthStore.getState().user;
    const currentUserId = currentProfile.id || authUser?.id || 'user_spendz';

    const newInvite: GroupInvite = {
      id: generateId(),
      groupId,
      code: generateInviteCode(group?.name),
      createdBy: currentUserId,
      createdAt: getTodayISO(),
      expiresAt: null, // V1 default: Never expires unless revoked
      isActive: true,
    };

    repository.createGroupInvite(newInvite);
    get().loadGroups();
    return newInvite;
  },

  getInviteByCode: (code) => {
    return repository.getInviteByCode(code.trim().toUpperCase());
  },

  revokeInvite: (inviteId) => {
    repository.revokeGroupInvite(inviteId);
    get().loadGroups();
  },

  validateInvite: (code) => {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) {
      return { status: 'invalid', message: 'This invite code is not valid.' };
    }

    const invite = repository.getInviteByCode(trimmed);
    if (!invite) {
      return { status: 'invalid', message: 'This invite code is not valid.' };
    }

    if (!invite.isActive) {
      return { status: 'inactive', message: 'This invite is no longer active.' };
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return { status: 'expired', message: 'This invite has expired.' };
    }

    const group =
      get().getGroupById(invite.groupId) ||
      repository.getGroups().find((g) => g.id === invite.groupId);

    if (!group) {
      return { status: 'group_deleted', message: 'This group is no longer available.' };
    }

    const currentProfile = useAppStore.getState().userProfile;
    const authUser = useAuthStore.getState().user;
    const currentUserId = currentProfile.id || authUser?.id;
    const currentUserName = currentProfile.fullName || currentProfile.name;

    const members = group.members || [];
    const memberNames = members.map((m) => {
      if (m.friend) return m.friend.name;
      if (m.name) return m.name;
      if (m.friendId === null) return 'Creator';
      return 'Member';
    });

    const isAlreadyMember = members.some((m) => {
      if (currentUserId && m.userId === currentUserId) return true;
      if (m.friendId === null && currentUserId && invite.createdBy === currentUserId) return true;
      if (
        currentUserName &&
        m.name &&
        m.name.trim().toLowerCase() === currentUserName.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (isAlreadyMember) {
      return {
        status: 'already_member',
        group,
        memberNames,
        message: "You're already a member of this group.",
      };
    }

    return {
      status: 'valid',
      invite,
      group,
      memberNames,
    };
  },

  joinGroupByCode: (code) => {
    const validation = get().validateInvite(code);
    if (validation.status === 'already_member') {
      return {
        success: false,
        message: "You're already a member of this group.",
        group: validation.group,
      };
    }

    if (validation.status !== 'valid') {
      return {
        success: false,
        message: validation.message,
      };
    }

    const currentProfile = useAppStore.getState().userProfile;
    const authUser = useAuthStore.getState().user;
    const currentUserId = currentProfile.id || authUser?.id || generateId();
    const currentUserName =
      currentProfile.fullName ||
      currentProfile.name ||
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      'Member';
    const currentAvatar = currentProfile.avatarUri || null;

    const newMember: GroupMember = {
      id: generateId(),
      groupId: validation.group.id,
      friendId: null,
      userId: currentUserId,
      name: currentUserName,
      avatarUrl: currentAvatar,
      role: 'member',
      createdAt: getTodayISO(),
    };

    const res = repository.joinGroup(validation.group.id, newMember);
    if (!res.success) {
      return { success: false, message: res.message || 'Failed to join group.' };
    }

    get().loadGroups();
    const updatedGroup = get().getGroupById(validation.group.id);

    return {
      success: true,
      message: `Successfully joined ${validation.group.name}!`,
      group: updatedGroup,
    };
  },

  refreshGroupMembers: (groupId) => {
    get().loadGroups();
  },
}));
