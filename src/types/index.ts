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

// ─── Group ───────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  friendId: string | null; // null = "You" (Me)
  createdAt: string;
  // Joined
  friend?: Friend | null;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidByFriendId: string | null; // null = "You" (Me)
  date: string;
  splitMethod: SplitMethod; // 'equal' | 'custom'
  createdAt: string;
  updatedAt: string;
  // Joined
  participants?: GroupExpenseParticipant[];
  paidByFriend?: Friend | null;
}

export interface GroupExpenseParticipant {
  id: string;
  groupExpenseId: string;
  friendId: string | null; // null = "You" (Me)
  shareAmount: number;
  // Joined
  friend?: Friend | null;
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  fromFriendId: string | null; // null = "You" (Me)
  toFriendId: string | null; // null = "You" (Me)
  amount: number;
  date: string;
  createdAt: string;
  // Joined
  fromFriend?: Friend | null;
  toFriend?: Friend | null;
}

export interface GroupMemberBalance {
  friendId: string | null; // null = "You" (Me)
  friend?: Friend | null;
  name: string;
  balance: number; // positive = net owed, negative = net owes
  balanceWithMe: number; // positive = owes Me, negative = Me owes them
}


// ─── App State ───────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id?: string;
  name: string;
  fullName?: string;
  email?: string;
  phone?: string;
  avatarUri?: string | null;
  currency: string;
  createdAt?: string;
  updatedAt?: string;
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
