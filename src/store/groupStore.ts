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
  Friend,
} from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO } from '@/utils/date';
import { generateInviteCode } from '@/utils/inviteCode';
import { useFriendStore } from './friendStore';
import { useAppStore } from './appStore';
import { useAuthStore } from './authStore';
import { SupabaseQueries } from '@/lib/supabaseQueries';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
  loadGroupFromSupabase: (groupId: string) => Promise<Group | null>;
  subscribeToGroupRealtime: (groupId: string) => () => void;
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
    paidByFriendId?: string | null;
    paidByMemberId?: string | null;
    paidByUserId?: string | null;
    splitMethod: SplitMethod;
    participants: Array<{
      friendId?: string | null;
      memberId?: string | null;
      userId?: string | null;
      shareAmount: number;
    }>;
  }) => GroupExpense;
  updateGroupExpense: (
    expenseId: string,
    data: {
      description: string;
      amount: number;
      date: string;
      paidByFriendId?: string | null;
      paidByMemberId?: string | null;
      paidByUserId?: string | null;
      splitMethod: SplitMethod;
      participants: Array<{
        friendId?: string | null;
        memberId?: string | null;
        userId?: string | null;
        shareAmount: number;
      }>;
    }
  ) => void;
  deleteGroupExpense: (expenseId: string) => void;

  addGroupSettlement: (data: {
    groupId: string;
    fromFriendId?: string | null;
    toFriendId?: string | null;
    fromMemberId?: string | null;
    fromUserId?: string | null;
    toMemberId?: string | null;
    toUserId?: string | null;
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
  getOrCreateInvite: (groupId: string) => Promise<GroupInvite>;
  getInviteByCode: (code: string) => GroupInvite | null;
  revokeInvite: (inviteId: string) => void;
  validateGroupInvite: (code: string) => Promise<InviteValidationResult>;
  validateInvite: (code: string) => Promise<InviteValidationResult>;
  joinGroupByInvite: (code: string) => Promise<{ success: boolean; message: string; group?: Group }>;
  joinGroupByCode: (code: string) => Promise<{ success: boolean; message: string; group?: Group }>;
  refreshGroupMembers: (groupId: string) => void;
}

// ─── Scoped Balance Engine ──────────────────────────────────────────
export function calculateGroupSummary(
  expenses: GroupExpense[],
  settlements: GroupSettlement[] = [],
  currentUserId?: string | null
): {
  totalExpenseAmount: number;
  totalYouPaid: number;
  yourShare: number;
  netBalance: number;
} {
  let totalExpenseAmount = 0;
  let totalYouPaid = 0;
  let yourShare = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    totalExpenseAmount += amt;

    const isPaidByMe = Boolean(
      (currentUserId && exp.paidByUserId && exp.paidByUserId === currentUserId) ||
      (!currentUserId && exp.paidByFriendId === null)
    );

    if (isPaidByMe) {
      totalYouPaid += amt;
    }

    const myParticipant = exp.participants?.find((p) =>
      (currentUserId && p.userId && p.userId === currentUserId) ||
      (!currentUserId && p.friendId === null)
    );
    if (myParticipant) {
      yourShare += Number(myParticipant.shareAmount) || 0;
    }
  }

  let settlementsPaidByMe = 0;
  let settlementsReceivedByMe = 0;

  for (const setl of settlements) {
    const amt = Number(setl.amount) || 0;
    const isFromMe = Boolean(
      (currentUserId && setl.fromUserId && setl.fromUserId === currentUserId) ||
      (!currentUserId && setl.fromFriendId === null)
    );
    const isToMe = Boolean(
      (currentUserId && setl.toUserId && setl.toUserId === currentUserId) ||
      (!currentUserId && setl.toFriendId === null)
    );

    if (isFromMe) {
      settlementsPaidByMe += amt;
    }
    if (isToMe) {
      settlementsReceivedByMe += amt;
    }
  }

  const netBalance =
    Math.round(((totalYouPaid + settlementsPaidByMe) - (yourShare + settlementsReceivedByMe)) * 100) / 100;

  return {
    totalExpenseAmount: Math.round(totalExpenseAmount * 100) / 100,
    totalYouPaid: Math.round(totalYouPaid * 100) / 100,
    yourShare: Math.round(yourShare * 100) / 100,
    netBalance,
  };
}

export function calculateGroupMemberBalances(
  group: Group | undefined,
  expenses: GroupExpense[],
  settlements: GroupSettlement[],
  friends: Friend[] = [],
  currentUserId?: string | null
): GroupMemberBalance[] {
  if (!group) return [];

  const rawMembers = group.members || [];
  const friendMap = new Map(friends.map((f) => [f.id, f]));

  // Helper to determine canonical member key:
  // Prefer userId if registered, else friendId if local friend, else memberId
  const getMemberKey = (m: { id?: string; userId?: string | null; friendId?: string | null }) => {
    if (m.userId) return `user:${m.userId}`;
    if (m.friendId) return `friend:${m.friendId}`;
    if (m.id) return `member:${m.id}`;
    return 'unknown';
  };

  // Find or identify "Me"
  let meMember = rawMembers.find((m) =>
    (currentUserId && m.userId && m.userId === currentUserId) ||
    (!currentUserId && m.friendId === null)
  );

  const members: GroupMember[] = [...rawMembers];
  if (!meMember) {
    meMember = {
      id: `me-${group.id}`,
      groupId: group.id,
      friendId: null,
      userId: currentUserId || null,
      name: 'You',
      createdAt: group.createdAt,
    };
    members.unshift(meMember);
  }

  const meKey = getMemberKey(meMember);

  // Map to easily look up member key from memberId, friendId, or userId
  const resolveEntityKey = (options: {
    userId?: string | null;
    memberId?: string | null;
    friendId?: string | null;
  }): string => {
    if (options.userId) return `user:${options.userId}`;
    if (options.memberId) {
      const match = members.find((m) => m.id === options.memberId);
      if (match) return getMemberKey(match);
      return `member:${options.memberId}`;
    }
    if (options.friendId === null) {
      return meKey;
    }
    if (options.friendId) {
      const match = members.find((m) => m.friendId === options.friendId);
      if (match) return getMemberKey(match);
      return `friend:${options.friendId}`;
    }
    return meKey;
  };

  // Track all participating keys
  const allKeys = new Set<string>();
  members.forEach((m) => allKeys.add(getMemberKey(m)));

  const totalPaidMap = new Map<string, number>();
  const totalShareMap = new Map<string, number>();
  // balanceWithMeMap: positive = owes Me, negative = Me owes them
  const balanceWithMeMap = new Map<string, number>();

  const initKey = (k: string) => {
    if (!totalPaidMap.has(k)) totalPaidMap.set(k, 0);
    if (!totalShareMap.has(k)) totalShareMap.set(k, 0);
    if (!balanceWithMeMap.has(k)) balanceWithMeMap.set(k, 0);
  };

  allKeys.forEach(initKey);

  // Process expenses
  for (const exp of expenses) {
    const payerKey = resolveEntityKey({
      userId: exp.paidByUserId,
      memberId: exp.paidByMemberId,
      friendId: exp.paidByFriendId,
    });
    initKey(payerKey);

    const expAmount = Number(exp.amount) || 0;
    totalPaidMap.set(payerKey, (totalPaidMap.get(payerKey) || 0) + expAmount);

    for (const p of exp.participants || []) {
      const pKey = resolveEntityKey({
        userId: p.userId,
        memberId: p.memberId,
        friendId: p.friendId,
      });
      initKey(pKey);

      const share = Number(p.shareAmount) || 0;
      totalShareMap.set(pKey, (totalShareMap.get(pKey) || 0) + share);

      if (payerKey === meKey && pKey !== meKey) {
        // I paid for pKey, so pKey owes Me
        balanceWithMeMap.set(pKey, (balanceWithMeMap.get(pKey) || 0) + share);
      } else if (payerKey !== meKey && pKey === meKey) {
        // payerKey paid for Me, so I owe payerKey
        balanceWithMeMap.set(payerKey, (balanceWithMeMap.get(payerKey) || 0) - share);
      }
    }
  }

  // Process settlements
  for (const setl of settlements) {
    const fromKey = resolveEntityKey({
      userId: setl.fromUserId,
      memberId: setl.fromMemberId,
      friendId: setl.fromFriendId,
    });
    const toKey = resolveEntityKey({
      userId: setl.toUserId,
      memberId: setl.toMemberId,
      friendId: setl.toFriendId,
    });
    initKey(fromKey);
    initKey(toKey);

    const amt = Number(setl.amount) || 0;
    totalPaidMap.set(fromKey, (totalPaidMap.get(fromKey) || 0) + amt);
    totalShareMap.set(toKey, (totalShareMap.get(toKey) || 0) + amt);

    if (fromKey === meKey && toKey !== meKey) {
      // I paid toKey, reducing what I owe them or increasing what they owe me
      balanceWithMeMap.set(toKey, (balanceWithMeMap.get(toKey) || 0) + amt);
    } else if (fromKey !== meKey && toKey === meKey) {
      // fromKey paid Me, reducing what they owe me
      balanceWithMeMap.set(fromKey, (balanceWithMeMap.get(fromKey) || 0) - amt);
    }
  }

  // Build the returned list
  return members.map((m) => {
    const mKey = getMemberKey(m);
    const isMe = mKey === meKey;
    const friendObj = m.friendId ? friendMap.get(m.friendId) || m.friend || null : null;
    const displayName = isMe ? 'You' : m.name || friendObj?.name || 'Member';

    const paid = totalPaidMap.get(mKey) || 0;
    const share = totalShareMap.get(mKey) || 0;
    const overallNet = Math.round((paid - share) * 100) / 100;
    const withMe = isMe ? overallNet : Math.round((balanceWithMeMap.get(mKey) || 0) * 100) / 100;

    return {
      memberId: m.id,
      userId: m.userId || null,
      friendId: m.friendId || null,
      friend: friendObj,
      name: displayName,
      balance: overallNet,
      balanceWithMe: withMe,
      isMe,
    };
  });
}

let isSyncingUserGroups = false;
const inFlightHydrations = new Map<string, Promise<any>>();

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

    // In background, sync user's groups from Supabase safely
    if (isSupabaseConfigured() && !isSyncingUserGroups) {
      isSyncingUserGroups = true;
      (async () => {
        try {
          const remoteGroups = await SupabaseQueries.getUserGroups();
          for (const rg of remoteGroups) {
            await get().loadGroupFromSupabase(rg.id);
          }
        } catch (e) {
          console.warn('[GROUP STORE] Background group sync failed:', e);
        } finally {
          isSyncingUserGroups = false;
        }
      })();
    }
  },

  loadGroupFromSupabase: async (groupId: string) => {
    if (!groupId) return null;
    if (inFlightHydrations.has(groupId)) {
      return inFlightHydrations.get(groupId);
    }

    const hydrationPromise = (async () => {
      try {
        console.log('[GROUP STORE] Hydrating group from Supabase:', groupId);
        const remoteData = await SupabaseQueries.getGroupDetails(groupId);
        if (!remoteData || !remoteData.group) {
          console.log('[GROUP STORE] No remote group found in Supabase for id:', groupId);
          return get().getGroupById(groupId) || null;
        }

        const { group: remoteGroup, members, expenses, settlements } = remoteData;

        // 1. Cache to local repository (only overwrite expenses/settlements if cleanly fetched)
        try {
          repository.upsertGroup(remoteGroup);
          for (const m of members) {
            repository.upsertGroupMember(m);
          }
          if (expenses !== null) {
            for (const exp of expenses) {
              repository.upsertGroupExpense(exp, exp.participants || []);
            }
          }
          if (settlements !== null) {
            for (const setl of settlements) {
              repository.upsertGroupSettlement(setl);
            }
          }
        } catch (repoErr) {
          console.warn('[GROUP STORE] Local cache error during Supabase hydration:', repoErr);
        }

        // 2. Hydrate Zustand in-memory state safely
        set((state) => {
          const groupExists = state.groups.some((g) => g.id === groupId);
          const updatedGroups = groupExists
            ? state.groups.map((g) => (g.id === groupId ? { ...remoteGroup, members } : g))
            : [{ ...remoteGroup, members }, ...state.groups];

          const updatedExpenses = expenses !== null
            ? [...expenses, ...state.groupExpenses.filter((e) => e.groupId !== groupId)]
            : state.groupExpenses;

          const updatedSettlements = settlements !== null
            ? [...settlements, ...state.groupSettlements.filter((s) => s.groupId !== groupId)]
            : state.groupSettlements;

          return {
            groups: updatedGroups,
            groupExpenses: updatedExpenses,
            groupSettlements: updatedSettlements,
          };
        });

        return get().getGroupById(groupId) || remoteGroup;
      } catch (e) {
        console.error('[GROUP STORE] Failed to load group from Supabase:', e);
        return get().getGroupById(groupId) || null;
      } finally {
        inFlightHydrations.delete(groupId);
      }
    })();

    inFlightHydrations.set(groupId, hydrationPromise);
    return hydrationPromise;
  },

  subscribeToGroupRealtime: (groupId: string) => {
    if (!isSupabaseConfigured() || !groupId) {
      return () => {};
    }

    console.log('[GROUP STORE] Subscribing to Supabase Realtime for group:', groupId);
    const channelName = `group-live-${groupId}`;

    let debounceTimer: any = null;
    const triggerReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('[GROUP STORE REALTIME] Change detected for group', groupId, '- rehydrating...');
        get().loadGroupFromSupabase(groupId);
      }, 200);
    };

    let channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        () => triggerReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` },
        () => triggerReload()
      );

    if (SupabaseQueries.isExpensesTableReady()) {
      channel = channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_expenses', filter: `group_id=eq.${groupId}` },
          () => triggerReload()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'group_expense_participants', filter: `group_id=eq.${groupId}` },
          () => triggerReload()
        );
    }

    if (SupabaseQueries.isSettlementsTableReady()) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_settlements', filter: `group_id=eq.${groupId}` },
        () => triggerReload()
      );
    }

    channel.subscribe((status) => {
      console.log(`[GROUP STORE REALTIME] Subscription status for group ${groupId}:`, status);
    });

    return () => {
      console.log('[GROUP STORE REALTIME] Unsubscribing channel for group:', groupId);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  },

  addGroup: (data) => {
    const now = getTodayISO();
    const groupId = generateId();
    const icon = data.icon?.trim() || '🏖';

    const currentProfile = useAppStore.getState().userProfile;
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);
    const currentUserName =
      currentProfile.fullName ||
      currentProfile.name ||
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      'Creator';

    // Current user ("Me", friendId: null) is always automatically a member
    const members: GroupMember[] = [
      {
        id: generateId(),
        groupId,
        friendId: null,
        userId: currentUserId || null,
        name: currentUserName,
        role: 'admin',
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
    SupabaseQueries.createGroupInSupabase(newGroup, members).catch((err) => {
      console.warn('Failed to sync new group to Supabase:', err);
    });

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

    const group = get().getGroupById(data.groupId) || repository.getGroups().find((g) => g.id === data.groupId);
    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    // Resolve payer
    let paidByMemberId = data.paidByMemberId || null;
    let paidByUserId = data.paidByUserId || null;
    let paidByFriendId = data.paidByFriendId !== undefined ? data.paidByFriendId : null;

    if (!paidByMemberId && group?.members) {
      if (paidByFriendId === null) {
        const meM = group.members.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null);
        if (meM) {
          paidByMemberId = meM.id;
          paidByUserId = meM.userId || currentUserId || null;
        }
      } else {
        const friendM = group.members.find((m) => m.friendId === paidByFriendId || m.id === paidByFriendId);
        if (friendM) {
          paidByMemberId = friendM.id;
          paidByUserId = friendM.userId || null;
        }
      }
    }

    const participantRecords: GroupExpenseParticipant[] = data.participants.map((p) => {
      let pMemberId = p.memberId || null;
      let pUserId = p.userId || null;
      let pFriendId = p.friendId !== undefined ? p.friendId : null;

      if (!pMemberId && group?.members) {
        if (pFriendId === null) {
          const meM = group.members.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null);
          if (meM) {
            pMemberId = meM.id;
            pUserId = meM.userId || currentUserId || null;
          }
        } else {
          const friendM = group.members.find((m) => m.friendId === pFriendId || m.id === pFriendId);
          if (friendM) {
            pMemberId = friendM.id;
            pUserId = friendM.userId || null;
          }
        }
      }

      return {
        id: generateId(),
        groupExpenseId: expenseId,
        friendId: pFriendId,
        memberId: pMemberId,
        userId: pUserId,
        shareAmount: Number(p.shareAmount) || 0,
        friend: pFriendId ? friendMap.get(pFriendId) || null : null,
      };
    });

    const newExpense: GroupExpense = {
      id: expenseId,
      groupId: data.groupId,
      description: data.description.trim(),
      amount,
      paidByFriendId,
      paidByMemberId,
      paidByUserId,
      date,
      splitMethod: data.splitMethod,
      createdAt: now,
      updatedAt: now,
      participants: participantRecords,
      paidByFriend: paidByFriendId ? friendMap.get(paidByFriendId) || null : null,
    };

    repository.addGroupExpense(
      {
        id: expenseId,
        groupId: data.groupId,
        description: data.description.trim(),
        amount,
        paidByFriendId,
        paidByMemberId,
        paidByUserId,
        date,
        splitMethod: data.splitMethod,
        createdAt: now,
        updatedAt: now,
      },
      participantRecords
    );

    repository.updateGroup(data.groupId, { updatedAt: now });

    if (authUser?.id) {
      SupabaseQueries.createGroupExpenseInSupabase(newExpense, participantRecords).catch((err) => {
        console.warn('[GROUP STORE] Failed to sync new expense to Supabase:', err);
      });
    }

    set((state) => ({
      groupExpenses: [newExpense, ...state.groupExpenses.filter((e) => e.id !== expenseId)],
      groups: state.groups.map((g) =>
        g.id === data.groupId ? { ...g, updatedAt: now } : g
      ),
    }));

    return newExpense;
  },

  updateGroupExpense: (expenseId, data) => {
    const now = getTodayISO();
    const amount = Number(data.amount) || 0;
    const existing = get().groupExpenses.find((e) => e.id === expenseId);
    const targetGroupId = existing?.groupId;
    const group = targetGroupId ? get().getGroupById(targetGroupId) : null;

    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    let paidByMemberId = data.paidByMemberId || existing?.paidByMemberId || null;
    let paidByUserId = data.paidByUserId || existing?.paidByUserId || null;
    let paidByFriendId = data.paidByFriendId !== undefined ? data.paidByFriendId : existing?.paidByFriendId || null;

    if (!paidByMemberId && group?.members) {
      if (paidByFriendId === null) {
        const meM = group.members.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null);
        if (meM) {
          paidByMemberId = meM.id;
          paidByUserId = meM.userId || currentUserId || null;
        }
      } else {
        const friendM = group.members.find((m) => m.friendId === paidByFriendId || m.id === paidByFriendId);
        if (friendM) {
          paidByMemberId = friendM.id;
          paidByUserId = friendM.userId || null;
        }
      }
    }

    const participantRecords: GroupExpenseParticipant[] = data.participants.map((p) => {
      let pMemberId = p.memberId || null;
      let pUserId = p.userId || null;
      let pFriendId = p.friendId !== undefined ? p.friendId : null;

      if (!pMemberId && group?.members) {
        if (pFriendId === null) {
          const meM = group.members.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null);
          if (meM) {
            pMemberId = meM.id;
            pUserId = meM.userId || currentUserId || null;
          }
        } else {
          const friendM = group.members.find((m) => m.friendId === pFriendId || m.id === pFriendId);
          if (friendM) {
            pMemberId = friendM.id;
            pUserId = friendM.userId || null;
          }
        }
      }

      return {
        id: generateId(),
        groupExpenseId: expenseId,
        friendId: pFriendId,
        memberId: pMemberId,
        userId: pUserId,
        shareAmount: Number(p.shareAmount) || 0,
        friend: pFriendId ? friendMap.get(pFriendId) || null : null,
      };
    });

    const updates: Partial<Omit<GroupExpense, 'participants'>> = {
      description: data.description.trim(),
      amount,
      date: data.date,
      paidByFriendId,
      paidByMemberId,
      paidByUserId,
      splitMethod: data.splitMethod,
      updatedAt: now,
    };

    repository.updateGroupExpense(expenseId, updates, participantRecords);

    if (targetGroupId) {
      repository.updateGroup(targetGroupId, { updatedAt: now });
      if (authUser?.id) {
        SupabaseQueries.updateGroupExpenseInSupabase(expenseId, targetGroupId, updates, participantRecords).catch((err) => {
          console.warn('[GROUP STORE] Failed to sync expense update to Supabase:', err);
        });
      }
    }

    const updatedExpense: GroupExpense = {
      ...(existing || ({} as any)),
      ...updates,
      id: expenseId,
      groupId: targetGroupId || '',
      description: data.description.trim(),
      amount,
      date: data.date,
      paidByFriendId,
      paidByMemberId,
      paidByUserId,
      splitMethod: data.splitMethod,
      updatedAt: now,
      participants: participantRecords,
      paidByFriend: paidByFriendId ? friendMap.get(paidByFriendId) || null : null,
    };

    set((state) => ({
      groupExpenses: state.groupExpenses.map((e) =>
        e.id === expenseId ? updatedExpense : e
      ),
      groups: targetGroupId
        ? state.groups.map((g) => (g.id === targetGroupId ? { ...g, updatedAt: now } : g))
        : state.groups,
    }));
  },

  deleteGroupExpense: (expenseId) => {
    const target = get().groupExpenses.find((e) => e.id === expenseId);
    const now = getTodayISO();

    repository.deleteGroupExpense(expenseId);

    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
      const authUser = useAuthStore.getState().user;
      if (authUser?.id) {
        SupabaseQueries.deleteGroupExpenseInSupabase(expenseId).catch((err) => {
          console.warn('[GROUP STORE] Failed to delete expense in Supabase:', err);
        });
      }
    }

    set((state) => ({
      groupExpenses: state.groupExpenses.filter((e) => e.id !== expenseId),
      groups: target?.groupId
        ? state.groups.map((g) => (g.id === target.groupId ? { ...g, updatedAt: now } : g))
        : state.groups,
    }));
  },

  addGroupSettlement: (data) => {
    const now = getTodayISO();
    const settlementId = generateId();
    const date = data.date || now;
    const amount = Number(data.amount) || 0;

    const group = get().getGroupById(data.groupId) || repository.getGroups().find((g) => g.id === data.groupId);
    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);

    const friends = useFriendStore.getState().friends;
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    let fromMemberId = data.fromMemberId || null;
    let fromUserId = data.fromUserId || null;
    let fromFriendId = data.fromFriendId !== undefined ? data.fromFriendId : null;

    let toMemberId = data.toMemberId || null;
    let toUserId = data.toUserId || null;
    let toFriendId = data.toFriendId !== undefined ? data.toFriendId : null;

    if (group?.members) {
      if (fromFriendId === null && !fromMemberId) {
        const meM = group.members.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null);
        if (meM) {
          fromMemberId = meM.id;
          fromUserId = meM.userId || currentUserId || null;
        }
      } else if (fromFriendId && !fromMemberId) {
        const mObj = group.members.find((m) => m.friendId === fromFriendId || m.id === fromFriendId);
        if (mObj) {
          fromMemberId = mObj.id;
          fromUserId = mObj.userId || null;
        }
      }

      if (toFriendId === null && !toMemberId) {
        const meM = group.members.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null);
        if (meM) {
          toMemberId = meM.id;
          toUserId = meM.userId || currentUserId || null;
        }
      } else if (toFriendId && !toMemberId) {
        const mObj = group.members.find((m) => m.friendId === toFriendId || m.id === toFriendId);
        if (mObj) {
          toMemberId = mObj.id;
          toUserId = mObj.userId || null;
        }
      }
    }

    const newSettlement: GroupSettlement = {
      id: settlementId,
      groupId: data.groupId,
      fromFriendId,
      fromMemberId,
      fromUserId,
      toFriendId,
      toMemberId,
      toUserId,
      amount,
      date,
      createdAt: now,
      fromFriend: fromFriendId ? friendMap.get(fromFriendId) || null : null,
      toFriend: toFriendId ? friendMap.get(toFriendId) || null : null,
    };

    repository.addGroupSettlement(newSettlement);
    repository.updateGroup(data.groupId, { updatedAt: now });

    if (authUser?.id) {
      SupabaseQueries.createGroupSettlementInSupabase(newSettlement).catch((err) => {
        console.warn('[GROUP STORE] Failed to sync settlement to Supabase:', err);
      });
    }

    set((state) => ({
      groupSettlements: [newSettlement, ...state.groupSettlements.filter((s) => s.id !== settlementId)],
      groups: state.groups.map((g) =>
        g.id === data.groupId ? { ...g, updatedAt: now } : g
      ),
    }));

    return newSettlement;
  },

  deleteGroupSettlement: (settlementId) => {
    const target = get().groupSettlements.find((s) => s.id === settlementId);
    const now = getTodayISO();

    repository.deleteGroupSettlement(settlementId);

    if (target?.groupId) {
      repository.updateGroup(target.groupId, { updatedAt: now });
      const authUser = useAuthStore.getState().user;
      if (authUser?.id) {
        SupabaseQueries.deleteGroupSettlementInSupabase(settlementId).catch((err) => {
          console.warn('[GROUP STORE] Failed to delete settlement in Supabase:', err);
        });
      }
    }

    set((state) => ({
      groupSettlements: state.groupSettlements.filter((s) => s.id !== settlementId),
      groups: target?.groupId
        ? state.groups.map((g) => (g.id === target.groupId ? { ...g, updatedAt: now } : g))
        : state.groups,
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

  getGroupMemberBalances: (groupId) => {
    const { groups, groupExpenses, groupSettlements } = get();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return [];
    const expenses = groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = groupSettlements.filter((s) => s.groupId === groupId);
    const friends = useFriendStore.getState().friends;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = currentProfile.id || useAuthStore.getState().user?.id;
    return calculateGroupMemberBalances(group, expenses, settlements, friends, currentUserId);
  },

  getGroupBalanceForMe: (groupId) => {
    const { groupExpenses, groupSettlements } = get();
    const expenses = groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = groupSettlements.filter((s) => s.groupId === groupId);
    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);
    return calculateGroupSummary(expenses, settlements, currentUserId).netBalance;
  },

  getGroupSummary: (groupId) => {
    const { groupExpenses, groupSettlements } = get();
    const expenses = groupExpenses.filter((e) => e.groupId === groupId);
    const settlements = groupSettlements.filter((s) => s.groupId === groupId);
    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);
    return calculateGroupSummary(expenses, settlements, currentUserId);
  },

  // ─── Group Invites & Joining ──────────────────────────────────────────
  getOrCreateInvite: async (groupId) => {
    const group = get().getGroupById(groupId) || repository.getGroups().find((g) => g.id === groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null) || 'user_spendz';
    const currentUserName = currentProfile.fullName || currentProfile.name || authUser?.user_metadata?.full_name || 'You';

    const creatorMember = group.members?.find((m) => (currentUserId && m.userId === currentUserId) || m.friendId === null) || {
      id: generateId(),
      groupId,
      friendId: null,
      userId: currentUserId,
      name: currentUserName,
      role: 'admin',
      createdAt: getTodayISO(),
    };

    const newInviteTemplate: GroupInvite = {
      id: generateId(),
      groupId,
      code: generateInviteCode(group.name),
      createdBy: currentUserId,
      createdAt: getTodayISO(),
      expiresAt: null,
      isActive: true,
    };

    // 1. If authenticated, sync group + creator + invite to Supabase (shared backend source of truth)
    if (authUser?.id) {
      console.log('[GROUP STORE] Syncing group invite to Supabase for group:', groupId);
      const syncRes = await SupabaseQueries.syncGroupAndInviteToSupabase(group, creatorMember, newInviteTemplate);
      if (syncRes.success && syncRes.invite) {
        const remoteInvite: GroupInvite = syncRes.invite;
        repository.createGroupInvite(remoteInvite);
        get().loadGroups();
        return remoteInvite;
      } else {
        console.error('[GROUP STORE] Supabase sync failed:', syncRes.error);
        throw new Error("Couldn't create the group invite. Please try again.");
      }
    }

    // 2. Fallback to existing active invite in local repository
    const activeInvite = repository.getActiveInviteByGroupId(groupId);
    if (activeInvite) {
      return activeInvite;
    }

    // 3. Fallback: save local invite
    repository.createGroupInvite(newInviteTemplate);
    get().loadGroups();
    return newInviteTemplate;
  },

  getInviteByCode: (code) => {
    return repository.getInviteByCode(code.trim().toUpperCase());
  },

  revokeInvite: (inviteId) => {
    repository.revokeGroupInvite(inviteId);
    SupabaseQueries.revokeGroupInviteInSupabase(inviteId).catch((e) => {
      console.warn('[GROUP STORE] Error revoking invite in Supabase:', e);
    });
    get().loadGroups();
  },

  validateGroupInvite: async (code) => {
    const rawCode = code;
    const trimmed = (code || '').trim().toUpperCase();

    console.log('[GROUP JOIN] 1. Join screen receives code (validate):', rawCode);
    console.log('[GROUP JOIN] 2. Normalized code (validate):', trimmed);

    if (!trimmed) {
      return { status: 'invalid', message: 'Please enter an invite code.' };
    }

    console.log('[GROUP JOIN] 3. Calling getInviteByCode (validate):', trimmed);
    let invite: GroupInvite | null = null;
    let group: Group | undefined = undefined;
    let remoteMembers: GroupMember[] | null = null;

    // Look in shared backend (Supabase) FIRST
    try {
      const remoteData = await SupabaseQueries.getInviteByCode(trimmed);
      if (remoteData) {
        invite = remoteData.invite;
        group = remoteData.group;
        remoteMembers = remoteData.members;
        console.log('[GROUP JOIN] Resolved invite from Supabase backend:', invite?.code, group?.name);
      }
    } catch (err: any) {
      console.warn('[GROUP JOIN] Error fetching invite from Supabase:', err?.message || err);
    }

    // Fallback: check local repository if offline or testing on same device
    if (!invite || !group) {
      const localInvite = repository.getInviteByCode(trimmed);
      if (localInvite) {
        invite = localInvite;
        group = get().getGroupById(localInvite.groupId) || repository.getGroups().find((g) => g.id === localInvite.groupId);
      }
    }

    console.log('[GROUP JOIN] 4. Returned invite (validate):', !!invite, invite ? { id: invite.id, code: invite.code, groupId: invite.groupId } : null);

    if (!invite) {
      return { status: 'invalid', message: 'This invite code is not valid.' };
    }

    if (!invite.isActive) {
      return { status: 'inactive', message: 'This invite is no longer active.' };
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return { status: 'expired', message: 'This invite has expired.' };
    }

    console.log('[GROUP JOIN] 5. invite.groupId (validate):', invite.groupId);
    console.log('[GROUP JOIN] 6. Group lookup (validate):', !!group, group?.name);

    if (!group) {
      return { status: 'group_deleted', message: 'This group is no longer available.' };
    }

    const currentProfile = useAppStore.getState().userProfile;
    const authUser = useAuthStore.getState().user;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null) || 'user_spendz';
    console.log('[GROUP JOIN] 7. Current authenticated user ID (validate):', currentUserId);

    const members = remoteMembers || group.members || repository.getGroupMembers(invite.groupId) || [];
    const memberNames = members.map((m) => {
      if (m.friend?.name) return m.friend.name;
      if (m.name) return m.name;
      if (m.friendId === null) return 'Creator';
      return 'Member';
    });

    const isAlreadyMember = members.some((m) => {
      if (currentUserId && m.userId && m.userId === currentUserId) return true;
      if (m.friendId === null && currentUserId && invite!.createdBy === currentUserId) return true;
      return false;
    });
    console.log('[GROUP JOIN] 8. Existing membership lookup (validate): isAlreadyMember =', isAlreadyMember);

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

  validateInvite: (code) => get().validateGroupInvite(code),

  joinGroupByInvite: async (code) => {
    const rawCode = code;
    const normalizedCode = (code || '').trim().toUpperCase();

    console.log('[GROUP JOIN] 1. Join screen receives code:', rawCode);
    console.log('[GROUP JOIN] 2. Normalized code:', normalizedCode);

    if (!normalizedCode) {
      return { success: false, message: 'Please enter a valid invite code.' };
    }

    const authUser = useAuthStore.getState().user;
    const currentProfile = useAppStore.getState().userProfile;
    const currentUserId = authUser?.id || (currentProfile.id !== 'user_spendz' ? currentProfile.id : null);

    if (!currentUserId || !authUser?.id) {
      return {
        success: false,
        message: 'Please sign in to join this group.',
      };
    }

    console.log('[GROUP JOIN] 3. Calling getInviteByCode():', normalizedCode);
    let invite: GroupInvite | null = null;
    let group: Group | undefined = undefined;
    let remoteMembers: GroupMember[] | null = null;

    // Supabase lookup first
    try {
      const remoteData = await SupabaseQueries.getInviteByCode(normalizedCode);
      if (remoteData) {
        invite = remoteData.invite;
        group = remoteData.group;
        remoteMembers = remoteData.members;
      }
    } catch (err: any) {
      console.warn('[GROUP JOIN] Error fetching invite from Supabase:', err?.message || err);
    }

    if (!invite || !group) {
      const localInvite = repository.getInviteByCode(normalizedCode);
      if (localInvite) {
        invite = localInvite;
        group = get().getGroupById(localInvite.groupId) || repository.getGroups().find((g) => g.id === localInvite.groupId);
      }
    }

    console.log('[GROUP JOIN] 4. Returned invite:', !!invite, invite ? { id: invite.id, code: invite.code, groupId: invite.groupId } : null);

    if (!invite) {
      return { success: false, message: 'This invite code is not valid.' };
    }

    if (!invite.isActive) {
      return { success: false, message: 'This invite is no longer active.' };
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      return { success: false, message: 'This invite has expired.' };
    }

    console.log('[GROUP JOIN] 5. invite.groupId:', invite.groupId);
    console.log('[GROUP JOIN] 6. Group lookup found:', !!group, group?.name);

    if (!group) {
      return { success: false, message: 'This group is no longer available.' };
    }

    console.log('[GROUP JOIN] 7. Current authenticated user ID:', currentUserId);

    const existingMembers = remoteMembers || repository.getGroupMembers(invite.groupId) || group.members || [];
    const isAlreadyMember = existingMembers.some((m) => {
      if (m.userId && m.userId === currentUserId) return true;
      if (m.friendId === null && invite!.createdBy === currentUserId) return true;
      return false;
    });
    console.log('[GROUP JOIN] 8. Existing membership lookup: isAlreadyMember =', isAlreadyMember);

    if (isAlreadyMember) {
      return {
        success: false,
        message: "You're already a member of this group.",
        group,
      };
    }

    const currentUserName =
      currentProfile.fullName ||
      currentProfile.name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      'Member';
    const currentAvatar = currentProfile.avatarUri || null;

    const newMember: GroupMember = {
      id: generateId(),
      groupId: invite.groupId,
      friendId: null,
      userId: currentUserId,
      name: currentUserName,
      avatarUrl: currentAvatar,
      role: 'member',
      createdAt: getTodayISO(),
    };

    console.log('[GROUP JOIN] 9. Create membership operation for user:', currentUserId, 'in group:', invite.groupId);

    // 1. Insert & verify membership in Supabase (shared backend) FIRST
    const remoteJoinRes = await SupabaseQueries.joinGroupInSupabase(invite.groupId, newMember);
    if (!remoteJoinRes.success) {
      console.error('[GROUP JOIN] Supabase join failed:', remoteJoinRes.message);
      return {
        success: false,
        message: remoteJoinRes.message || 'Failed to join group in database. Please check your internet connection.',
      };
    }

    // 2. Cache membership and group into local repository
    const dbResult = repository.joinGroup(invite.groupId, newMember, group);
    console.log('[GROUP JOIN] 10. Local repository cache response:', dbResult);

    // 3. Update reactive state immediately
    set((state) => {
      const groupExists = state.groups.some((g) => g.id === invite!.groupId);
      if (groupExists) {
        return {
          groups: state.groups.map((g) =>
            g.id === invite!.groupId
              ? {
                  ...g,
                  members: g.members?.some(
                    (m) => m.id === newMember.id || (m.userId && m.userId === newMember.userId)
                  )
                    ? g.members
                    : [...(g.members || []), newMember],
                }
              : g
          ),
        };
      } else {
        const baseGroup = group!;
        const updatedMembers = baseGroup.members?.some(
          (m) => m.id === newMember.id || (m.userId && m.userId === newMember.userId)
        )
          ? baseGroup.members
          : [...(baseGroup.members || []), newMember];

        return {
          groups: [{ ...baseGroup, members: updatedMembers }, ...state.groups],
        };
      }
    });

    // Hydrate complete shared dataset (members, expenses, settlements) from Supabase immediately on joining
    await get().loadGroupFromSupabase(invite.groupId);
    const updatedGroup = get().getGroupById(invite.groupId) || group;
    const storeHasGroup = Boolean(get().groups.some((g) => g.id === invite!.groupId));
    console.log('[GROUP JOIN] 11. Zustand update complete, group in store:', storeHasGroup);

    console.log('[GROUP JOIN] 12. Final navigation target:', `/groups/${invite.groupId}`);

    return {
      success: true,
      message: `Successfully joined ${group.name}!`,
      group: updatedGroup,
    };
  },

  joinGroupByCode: (code) => get().joinGroupByInvite(code),

  refreshGroupMembers: (groupId) => {
    try {
      const updatedMembers = repository.getGroupMembers(groupId);
      set((state) => ({
        groups: state.groups.map((g) =>
          g.id === groupId ? { ...g, members: updatedMembers } : g
        ),
      }));
    } catch (e) {
      console.error('Failed to refresh group members:', e);
    }
  },
}));
