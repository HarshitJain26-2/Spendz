import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

// ─── Accounts ─────────────────────────────────────────────────────────
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'cash' | 'bank' | 'wallet' | 'card' | 'custom'
  balance: real('balance').notNull().default(0),
  icon: text('icon').notNull().default('Wallet'),
  color: text('color').notNull().default('#3B82F6'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─── Categories ───────────────────────────────────────────────────────
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  type: text('type').notNull(), // 'expense' | 'income'
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

// ─── Transactions ─────────────────────────────────────────────────────
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'expense' | 'income' | 'transfer'
  amount: real('amount').notNull(),
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  toAccountId: text('to_account_id').references(() => accounts.id),
  note: text('note').notNull().default(''),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ─── Friends ──────────────────────────────────────────────────────────
export const friends = sqliteTable('friends', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  avatarColor: text('avatar_color').notNull(),
  createdAt: text('created_at').notNull(),
});

// ─── Split Expenses ───────────────────────────────────────────────────
export const splitExpenses = sqliteTable('split_expenses', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  totalAmount: real('total_amount').notNull(),
  splitMethod: text('split_method').notNull(), // 'equal' | 'custom'
  status: text('status').notNull().default('pending'), // 'pending' | 'partial' | 'settled'
  paidByType: text('paid_by_type').notNull().default('me'), // 'me' | 'friend'
  paidByFriendId: text('paid_by_friend_id').references(() => friends.id),
  createdAt: text('created_at').notNull(),
});

// ─── Split Participants ───────────────────────────────────────────────
export const splitParticipants = sqliteTable('split_participants', {
  id: text('id').primaryKey(),
  splitExpenseId: text('split_expense_id').notNull().references(() => splitExpenses.id),
  friendId: text('friend_id').references(() => friends.id), // null = "you"
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
  settledAt: text('settled_at'),
});

// ─── App Settings ──────────────────────────────────────────────────────
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

