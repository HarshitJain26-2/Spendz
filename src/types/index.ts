// ─── Account ─────────────────────────────────────────────────────────
export type AccountType = 'cash' | 'bank' | 'wallet' | 'card' | 'custom';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Category ────────────────────────────────────────────────────────
export type CategoryType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  isDefault: boolean;
  createdAt: string;
}

// ─── Transaction ─────────────────────────────────────────────────────
export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  accountId: string;
  toAccountId: string | null; // for transfers
  note: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (not in DB, populated in queries)
  category?: Category | null;
  account?: Account;
  toAccount?: Account | null;
}

// ─── Friend ──────────────────────────────────────────────────────────
export interface Friend {
  id: string;
  name: string;
  phone: string | null;
  avatarColor: string;
  createdAt: string;
}

// ─── Split Expense ───────────────────────────────────────────────────
export type SplitMethod = 'equal' | 'custom';
export type SplitStatus = 'pending' | 'partial' | 'settled';
export type PaidByType = 'me' | 'friend';

export interface SplitExpense {
  id: string;
  transactionId: string;
  totalAmount: number;
  splitMethod: SplitMethod;
  status: SplitStatus;
  paidByType: PaidByType;
  paidByFriendId?: string | null;
  createdAt: string;
  // Joined
  participants?: SplitParticipant[];
  transaction?: Transaction;
}

export interface SplitParticipant {
  id: string;
  splitExpenseId: string;
  friendId: string | null; // null = "you"
  name: string;
  amount: number;
  isPaid: boolean;
  settledAt: string | null;
  // Joined
  friend?: Friend | null;
}

// ─── App State ───────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  name: string;
  currency: string;
}

// ─── Utility Types ───────────────────────────────────────────────────
export interface MonthSummary {
  income: number;
  expense: number;
  saved: number;
}

export interface FriendBalance {
  friendId: string;
  friend: Friend;
  balance: number; // positive = they owe you, negative = you owe them
}

export interface CategoryBreakdown {
  categoryId: string;
  category: Category;
  amount: number;
  percentage: number;
  count: number;
}

export interface DateGroup<T> {
  title: string;
  date: string;
  data: T[];
}
