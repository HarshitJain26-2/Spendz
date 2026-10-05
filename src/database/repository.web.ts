import type { DatabaseRepository } from './types';
import type {
  Account,
  Category,
  Transaction,
  Friend,
  SplitExpense,
  SplitParticipant,
  SplitStatus,
  Group,
  GroupMember,
  GroupExpense,
  GroupExpenseParticipant,
  GroupSettlement,
} from '@/types';
import { ALL_DEFAULT_CATEGORIES } from '@/constants/categories';
import { generateId, getTodayISO } from '@/utils/date';

const STORAGE_KEYS = {
  ACCOUNTS: 'spendz_web_accounts',
  CATEGORIES: 'spendz_web_categories',
  TRANSACTIONS: 'spendz_web_transactions',
  FRIENDS: 'spendz_web_friends',
  SPLITS: 'spendz_web_splits',
  PARTICIPANTS: 'spendz_web_split_participants',
  SETTINGS: 'spendz_web_settings',
  GROUPS: 'spendz_web_groups',
  GROUP_MEMBERS: 'spendz_web_group_members',
  GROUP_EXPENSES: 'spendz_web_group_expenses',
  GROUP_PARTICIPANTS: 'spendz_web_group_expense_participants',
  GROUP_SETTLEMENTS: 'spendz_web_group_settlements',
};


function getStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const val = window.localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    console.warn(`[Spendz Web Storage] Error reading ${key}:`, e);
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn(`[Spendz Web Storage] Error writing ${key}:`, e);
  }
}

export const repository: DatabaseRepository = {
  async init() {
    // Check and seed default categories if needed
    this.seedDefaultCategories();

    // Safe cleanup of any orphaned split records whose transaction_id no longer exists
    const transactions = getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const validTxIds = new Set(transactions.map((t) => t.id));
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(STORAGE_KEYS.SPLITS, []);
    const validSplits = splits.filter((s) => validTxIds.has(s.transactionId));
    if (validSplits.length !== splits.length) {
      setStorage(STORAGE_KEYS.SPLITS, validSplits);
      const validSplitIds = new Set(validSplits.map((s) => s.id));
      const participants = getStorage<SplitParticipant[]>(STORAGE_KEYS.PARTICIPANTS, []);
      const validParticipants = participants.filter((p) => validSplitIds.has(p.splitExpenseId));
      setStorage(STORAGE_KEYS.PARTICIPANTS, validParticipants);
    }
  },

  seedDefaultCategories() {
    const existing = getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const existingKeys = new Set(
      existing.map((c) => `${c.name.trim().toLowerCase()}_${c.type.toLowerCase()}`)
    );

    const now = getTodayISO();
    let updated = false;
    const result = [...existing];

    for (const cat of ALL_DEFAULT_CATEGORIES) {
      const key = `${cat.name.trim().toLowerCase()}_${cat.type.toLowerCase()}`;
      if (!existingKeys.has(key)) {
        result.push({
          id: generateId(),
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          isDefault: true,
          createdAt: now,
        });
        existingKeys.add(key);
        updated = true;
      }
    }

    if (updated || existing.length === 0) {
      setStorage(STORAGE_KEYS.CATEGORIES, result);
    }
  },

  // ─── Accounts ────────────────────────────────────────────────────────
  getAccounts(): Account[] {
    return getStorage<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
  },

  addAccount(account: Account) {
    const accounts = getStorage<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    accounts.push(account);
    setStorage(STORAGE_KEYS.ACCOUNTS, accounts);
  },

  updateAccount(id: string, data: Partial<Account>) {
    const accounts = getStorage<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    const updated = accounts.map((a) => (a.id === id ? { ...a, ...data } : a));
    setStorage(STORAGE_KEYS.ACCOUNTS, updated);
  },

  deleteAccount(id: string) {
    const accounts = getStorage<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    const filtered = accounts.filter((a) => a.id !== id);
    setStorage(STORAGE_KEYS.ACCOUNTS, filtered);
  },

  // ─── Categories ──────────────────────────────────────────────────────
  getCategories(): Category[] {
    return getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  },

  addCategory(category: Category) {
    const categories = getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    categories.push(category);
    setStorage(STORAGE_KEYS.CATEGORIES, categories);
  },

  updateCategory(id: string, data: Partial<Category>) {
    const categories = getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const updated = categories.map((c) => (c.id === id ? { ...c, ...data } : c));
    setStorage(STORAGE_KEYS.CATEGORIES, updated);
  },

  deleteCategory(id: string) {
    const categories = getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const filtered = categories.filter((c) => c.id !== id);
    setStorage(STORAGE_KEYS.CATEGORIES, filtered);
  },

  // ─── Transactions ────────────────────────────────────────────────────
  getTransactions(): Transaction[] {
    const transactions = getStorage<Transaction[]>(
      STORAGE_KEYS.TRANSACTIONS,
      []
    );
    // Sort descending by date
    return transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  addTransaction(transaction: Transaction) {
    const transactions = getStorage<Transaction[]>(
      STORAGE_KEYS.TRANSACTIONS,
      []
    );
    transactions.unshift(transaction);
    setStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
  },

  updateTransaction(id: string, data: Partial<Transaction>) {
    const transactions = getStorage<Transaction[]>(
      STORAGE_KEYS.TRANSACTIONS,
      []
    );
    const updated = transactions.map((t) =>
      t.id === id ? { ...t, ...data } : t
    );
    setStorage(STORAGE_KEYS.TRANSACTIONS, updated);
  },

  deleteTransaction(id: string) {
    // Cascade-delete linked split expenses & participants
    this.deleteSplitByTransactionId(id);
    const transactions = getStorage<Transaction[]>(
      STORAGE_KEYS.TRANSACTIONS,
      []
    );
    const filtered = transactions.filter((t) => t.id !== id);
    setStorage(STORAGE_KEYS.TRANSACTIONS, filtered);
  },

  // ─── Friends ─────────────────────────────────────────────────────────
  getFriends(): Friend[] {
    return getStorage<Friend[]>(STORAGE_KEYS.FRIENDS, []);
  },

  addFriend(friend: Friend) {
    const friends = getStorage<Friend[]>(STORAGE_KEYS.FRIENDS, []);
    friends.push(friend);
    setStorage(STORAGE_KEYS.FRIENDS, friends);
  },

  updateFriend(id: string, data: Partial<Friend>) {
    const friends = getStorage<Friend[]>(STORAGE_KEYS.FRIENDS, []);
    const updated = friends.map((f) => (f.id === id ? { ...f, ...data } : f));
    setStorage(STORAGE_KEYS.FRIENDS, updated);

    if (data.name) {
      const participants = getStorage<SplitParticipant[]>(
        STORAGE_KEYS.PARTICIPANTS,
        []
      );
      const updatedParticipants = participants.map((p) =>
        p.friendId === id ? { ...p, name: data.name! } : p
      );
      setStorage(STORAGE_KEYS.PARTICIPANTS, updatedParticipants);
    }
  },

  deleteFriend(id: string) {
    const friends = getStorage<Friend[]>(STORAGE_KEYS.FRIENDS, []);
    const filtered = friends.filter((f) => f.id !== id);
    setStorage(STORAGE_KEYS.FRIENDS, filtered);
  },

  // ─── Split Expenses ──────────────────────────────────────────────────
  getSplitExpenses(): SplitExpense[] {
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(
      STORAGE_KEYS.SPLITS,
      []
    );
    const participants = getStorage<SplitParticipant[]>(
      STORAGE_KEYS.PARTICIPANTS,
      []
    );

    return splits.map((s) => ({
      ...s,
      paidByType: s.paidByType || 'me',
      paidByFriendId: s.paidByFriendId || null,
      participants: participants.filter((p) => p.splitExpenseId === s.id),
    }));
  },

  addSplitExpense(
    split: Omit<SplitExpense, 'participants'>,
    participants: SplitParticipant[]
  ) {
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(
      STORAGE_KEYS.SPLITS,
      []
    );
    splits.push(split);
    setStorage(STORAGE_KEYS.SPLITS, splits);

    const allParticipants = getStorage<SplitParticipant[]>(
      STORAGE_KEYS.PARTICIPANTS,
      []
    );
    allParticipants.push(...participants);
    setStorage(STORAGE_KEYS.PARTICIPANTS, allParticipants);
  },

  updateSplitExpense(
    id: string,
    data: Partial<Omit<SplitExpense, 'participants'>>,
    participants?: SplitParticipant[]
  ) {
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(
      STORAGE_KEYS.SPLITS,
      []
    );
    const updatedSplits = splits.map((s) =>
      s.id === id ? { ...s, ...data } : s
    );
    setStorage(STORAGE_KEYS.SPLITS, updatedSplits);

    if (participants) {
      const allParticipants = getStorage<SplitParticipant[]>(
        STORAGE_KEYS.PARTICIPANTS,
        []
      );
      const filtered = allParticipants.filter((p) => p.splitExpenseId !== id);
      filtered.push(...participants);
      setStorage(STORAGE_KEYS.PARTICIPANTS, filtered);
    }
  },

  settleSplitParticipant(
    splitExpenseId: string,
    participantId: string,
    settledAt: string,
    newStatus: SplitStatus
  ) {
    // Update participant
    const participants = getStorage<SplitParticipant[]>(
      STORAGE_KEYS.PARTICIPANTS,
      []
    );
    const updatedParticipants = participants.map((p) =>
      p.id === participantId ? { ...p, isPaid: true, settledAt } : p
    );
    setStorage(STORAGE_KEYS.PARTICIPANTS, updatedParticipants);

    // Update split status
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(
      STORAGE_KEYS.SPLITS,
      []
    );
    const updatedSplits = splits.map((s) =>
      s.id === splitExpenseId ? { ...s, status: newStatus } : s
    );
    setStorage(STORAGE_KEYS.SPLITS, updatedSplits);
  },

  deleteSplitExpense(id: string) {
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(
      STORAGE_KEYS.SPLITS,
      []
    );
    const filteredSplits = splits.filter((s) => s.id !== id);
    setStorage(STORAGE_KEYS.SPLITS, filteredSplits);

    const participants = getStorage<SplitParticipant[]>(
      STORAGE_KEYS.PARTICIPANTS,
      []
    );
    const filteredParticipants = participants.filter(
      (p) => p.splitExpenseId !== id
    );
    setStorage(STORAGE_KEYS.PARTICIPANTS, filteredParticipants);
  },

  deleteSplitByTransactionId(transactionId: string) {
    const splits = getStorage<Omit<SplitExpense, 'participants'>[]>(
      STORAGE_KEYS.SPLITS,
      []
    );
    const targetSplits = splits.filter((s) => s.transactionId === transactionId);
    for (const s of targetSplits) {
      this.deleteSplitExpense(s.id);
    }
  },

  // ─── Groups ──────────────────────────────────────────────────────────
  getGroups(): Group[] {
    const groups = getStorage<Group[]>(STORAGE_KEYS.GROUPS, []);
    const members = getStorage<GroupMember[]>(STORAGE_KEYS.GROUP_MEMBERS, []);
    const friends = this.getFriends();
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    return groups.map((g) => ({
      ...g,
      members: members
        .filter((m) => m.groupId === g.id)
        .map((m) => ({
          ...m,
          friend: m.friendId ? friendMap.get(m.friendId) || null : null,
        })),
    }));
  },

  addGroup(group: Group, members: GroupMember[]) {
    const groups = getStorage<Group[]>(STORAGE_KEYS.GROUPS, []);
    groups.unshift(group);
    setStorage(STORAGE_KEYS.GROUPS, groups);

    const allMembers = getStorage<GroupMember[]>(STORAGE_KEYS.GROUP_MEMBERS, []);
    allMembers.push(...members);
    setStorage(STORAGE_KEYS.GROUP_MEMBERS, allMembers);
  },

  updateGroup(id: string, data: Partial<Group>) {
    const groups = getStorage<Group[]>(STORAGE_KEYS.GROUPS, []);
    const updated = groups.map((g) => (g.id === id ? { ...g, ...data } : g));
    setStorage(STORAGE_KEYS.GROUPS, updated);
  },

  deleteGroup(id: string) {
    const groups = getStorage<Group[]>(STORAGE_KEYS.GROUPS, []);
    setStorage(STORAGE_KEYS.GROUPS, groups.filter((g) => g.id !== id));

    const members = getStorage<GroupMember[]>(STORAGE_KEYS.GROUP_MEMBERS, []);
    setStorage(STORAGE_KEYS.GROUP_MEMBERS, members.filter((m) => m.groupId !== id));

    // Delete group expenses & participants
    const expenses = getStorage<Omit<GroupExpense, 'participants'>[]>(STORAGE_KEYS.GROUP_EXPENSES, []);
    const groupExpenseIds = new Set(expenses.filter((e) => e.groupId === id).map((e) => e.id));
    setStorage(STORAGE_KEYS.GROUP_EXPENSES, expenses.filter((e) => e.groupId !== id));

    const participants = getStorage<GroupExpenseParticipant[]>(STORAGE_KEYS.GROUP_PARTICIPANTS, []);
    setStorage(STORAGE_KEYS.GROUP_PARTICIPANTS, participants.filter((p) => !groupExpenseIds.has(p.groupExpenseId)));

    // Delete group settlements
    const settlements = getStorage<GroupSettlement[]>(STORAGE_KEYS.GROUP_SETTLEMENTS, []);
    setStorage(STORAGE_KEYS.GROUP_SETTLEMENTS, settlements.filter((s) => s.groupId !== id));
  },

  addGroupMember(member: GroupMember) {
    const members = getStorage<GroupMember[]>(STORAGE_KEYS.GROUP_MEMBERS, []);
    // Prevent duplicate member in same group
    const exists = members.some((m) => m.groupId === member.groupId && m.friendId === member.friendId);
    if (!exists) {
      members.push(member);
      setStorage(STORAGE_KEYS.GROUP_MEMBERS, members);
    }
  },

  removeGroupMember(groupId: string, friendId: string | null) {
    const members = getStorage<GroupMember[]>(STORAGE_KEYS.GROUP_MEMBERS, []);
    const filtered = members.filter((m) => !(m.groupId === groupId && m.friendId === friendId));
    setStorage(STORAGE_KEYS.GROUP_MEMBERS, filtered);
  },

  // ─── Group Expenses ──────────────────────────────────────────────────
  getGroupExpenses(groupId?: string): GroupExpense[] {
    const expenses = getStorage<Omit<GroupExpense, 'participants'>[]>(
      STORAGE_KEYS.GROUP_EXPENSES,
      []
    );
    const participants = getStorage<GroupExpenseParticipant[]>(
      STORAGE_KEYS.GROUP_PARTICIPANTS,
      []
    );
    const friends = this.getFriends();
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    const filteredExpenses = groupId
      ? expenses.filter((e) => e.groupId === groupId)
      : expenses;

    // Sort descending by date
    return filteredExpenses
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((e) => ({
        ...e,
        paidByFriend: e.paidByFriendId ? friendMap.get(e.paidByFriendId) || null : null,
        participants: participants
          .filter((p) => p.groupExpenseId === e.id)
          .map((p) => ({
            ...p,
            friend: p.friendId ? friendMap.get(p.friendId) || null : null,
          })),
      }));
  },

  addGroupExpense(
    expense: Omit<GroupExpense, 'participants'>,
    participants: GroupExpenseParticipant[]
  ) {
    const expenses = getStorage<Omit<GroupExpense, 'participants'>[]>(
      STORAGE_KEYS.GROUP_EXPENSES,
      []
    );
    expenses.unshift(expense);
    setStorage(STORAGE_KEYS.GROUP_EXPENSES, expenses);

    const allParticipants = getStorage<GroupExpenseParticipant[]>(
      STORAGE_KEYS.GROUP_PARTICIPANTS,
      []
    );
    allParticipants.push(...participants);
    setStorage(STORAGE_KEYS.GROUP_PARTICIPANTS, allParticipants);
  },

  updateGroupExpense(
    id: string,
    data: Partial<Omit<GroupExpense, 'participants'>>,
    participants?: GroupExpenseParticipant[]
  ) {
    const expenses = getStorage<Omit<GroupExpense, 'participants'>[]>(
      STORAGE_KEYS.GROUP_EXPENSES,
      []
    );
    const updatedExpenses = expenses.map((e) => (e.id === id ? { ...e, ...data } : e));
    setStorage(STORAGE_KEYS.GROUP_EXPENSES, updatedExpenses);

    if (participants) {
      const allParticipants = getStorage<GroupExpenseParticipant[]>(
        STORAGE_KEYS.GROUP_PARTICIPANTS,
        []
      );
      const filtered = allParticipants.filter((p) => p.groupExpenseId !== id);
      filtered.push(...participants);
      setStorage(STORAGE_KEYS.GROUP_PARTICIPANTS, filtered);
    }
  },

  deleteGroupExpense(id: string) {
    const expenses = getStorage<Omit<GroupExpense, 'participants'>[]>(
      STORAGE_KEYS.GROUP_EXPENSES,
      []
    );
    setStorage(STORAGE_KEYS.GROUP_EXPENSES, expenses.filter((e) => e.id !== id));

    const participants = getStorage<GroupExpenseParticipant[]>(
      STORAGE_KEYS.GROUP_PARTICIPANTS,
      []
    );
    setStorage(STORAGE_KEYS.GROUP_PARTICIPANTS, participants.filter((p) => p.groupExpenseId !== id));
  },

  // ─── Group Settlements ───────────────────────────────────────────────
  getGroupSettlements(groupId?: string): GroupSettlement[] {
    const settlements = getStorage<GroupSettlement[]>(STORAGE_KEYS.GROUP_SETTLEMENTS, []);
    const friends = this.getFriends();
    const friendMap = new Map(friends.map((f) => [f.id, f]));

    const filtered = groupId
      ? settlements.filter((s) => s.groupId === groupId)
      : settlements;

    return filtered
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((s) => ({
        ...s,
        fromFriend: s.fromFriendId ? friendMap.get(s.fromFriendId) || null : null,
        toFriend: s.toFriendId ? friendMap.get(s.toFriendId) || null : null,
      }));
  },

  addGroupSettlement(settlement: GroupSettlement) {
    const settlements = getStorage<GroupSettlement[]>(STORAGE_KEYS.GROUP_SETTLEMENTS, []);
    settlements.unshift(settlement);
    setStorage(STORAGE_KEYS.GROUP_SETTLEMENTS, settlements);
  },

  deleteGroupSettlement(id: string) {
    const settlements = getStorage<GroupSettlement[]>(STORAGE_KEYS.GROUP_SETTLEMENTS, []);
    setStorage(STORAGE_KEYS.GROUP_SETTLEMENTS, settlements.filter((s) => s.id !== id));
  },


  // ─── Settings ────────────────────────────────────────────────────────
  getSetting(key: string): string | null {
    const settings = getStorage<Record<string, string>>(STORAGE_KEYS.SETTINGS, {});
    return settings[key] !== undefined ? settings[key] : null;
  },

  setSetting(key: string, value: string): void {
    const settings = getStorage<Record<string, string>>(STORAGE_KEYS.SETTINGS, {});
    settings[key] = value;
    setStorage(STORAGE_KEYS.SETTINGS, settings);
  },

  getAppSettings() {
    const hasOnboardedStr = this.getSetting('hasOnboarded');
    const themeModeStr = this.getSetting('themeMode');
    const userNameStr = this.getSetting('userName');
    const currencyStr = this.getSetting('currency');
    const profileIdStr = this.getSetting('profileId');
    const profileEmailStr = this.getSetting('profileEmail');
    const profilePhoneStr = this.getSetting('profilePhone');
    const profileAvatarStr = this.getSetting('profileAvatar');
    const profileCreatedAtStr = this.getSetting('profileCreatedAt');
    const profileUpdatedAtStr = this.getSetting('profileUpdatedAt');

    const name = userNameStr || '';
    return {
      hasOnboarded: hasOnboardedStr === 'true',
      themeMode: (themeModeStr as any) || 'light',
      userProfile: {
        id: profileIdStr || 'user_spendz',
        name,
        fullName: name,
        email: profileEmailStr || '',
        phone: profilePhoneStr || '',
        avatarUri: profileAvatarStr || null,
        currency: currencyStr || '₹',
        createdAt: profileCreatedAtStr || '',
        updatedAt: profileUpdatedAtStr || '',
      },
    };
  },

  saveAppSettings(settings) {
    if (settings.hasOnboarded !== undefined) {
      this.setSetting('hasOnboarded', String(settings.hasOnboarded));
    }
    if (settings.themeMode !== undefined) {
      this.setSetting('themeMode', settings.themeMode);
    }
    if (settings.userProfile) {
      const p = settings.userProfile;
      const name = p.fullName !== undefined ? p.fullName : p.name;
      if (name !== undefined) {
        this.setSetting('userName', name);
      }
      if (p.email !== undefined) {
        this.setSetting('profileEmail', p.email);
      }
      if (p.phone !== undefined) {
        this.setSetting('profilePhone', p.phone);
      }
      if (p.avatarUri !== undefined) {
        this.setSetting('profileAvatar', p.avatarUri || '');
      }
      if (p.currency !== undefined) {
        this.setSetting('currency', p.currency);
      }
      if (p.id !== undefined) {
        this.setSetting('profileId', p.id);
      }
      if (p.createdAt !== undefined) {
        this.setSetting('profileCreatedAt', p.createdAt);
      }
      if (p.updatedAt !== undefined) {
        this.setSetting('profileUpdatedAt', p.updatedAt);
      }
    }
  },
};

