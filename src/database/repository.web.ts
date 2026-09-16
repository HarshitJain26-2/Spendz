import type { DatabaseRepository } from './types';
import type {
  Account,
  Category,
  Transaction,
  Friend,
  SplitExpense,
  SplitParticipant,
  SplitStatus,
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
  },

  seedDefaultCategories() {
    const existing = getStorage<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    if (existing.length > 0) return;

    const now = getTodayISO();
    const seeded: Category[] = ALL_DEFAULT_CATEGORIES.map((cat) => ({
      id: generateId(),
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      isDefault: true,
      createdAt: now,
    }));

    setStorage(STORAGE_KEYS.CATEGORIES, seeded);
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
};
