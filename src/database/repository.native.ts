import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, desc } from 'drizzle-orm';
import * as schema from './schema';
import type { DatabaseRepository } from './types';
import type {
  Account,
  AccountType,
  Category,
  CategoryType,
  Transaction,
  TransactionType,
  Friend,
  SplitExpense,
  SplitParticipant,
  SplitMethod,
  SplitStatus,
} from '@/types';
import { ALL_DEFAULT_CATEGORIES } from '@/constants/categories';
import { generateId, getTodayISO } from '@/utils/date';

const DB_NAME = 'spendz.db';

let sqliteDb: SQLite.SQLiteDatabase | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

const getDb = () => {
  if (!dbInstance) {
    sqliteDb = SQLite.openDatabaseSync(DB_NAME);
    dbInstance = drizzle(sqliteDb, { schema });
  }
  return dbInstance;
};

export const repository: DatabaseRepository = {
  async init() {
    const db = getDb();
    if (sqliteDb) {
      sqliteDb.execSync(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          balance REAL NOT NULL DEFAULT 0,
          icon TEXT NOT NULL DEFAULT 'Wallet',
          color TEXT NOT NULL DEFAULT '#3B82F6',
          is_default INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          type TEXT NOT NULL,
          is_default INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          category_id TEXT REFERENCES categories(id),
          account_id TEXT NOT NULL REFERENCES accounts(id),
          to_account_id TEXT REFERENCES accounts(id),
          note TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS friends (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          avatar_color TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS split_expenses (
          id TEXT PRIMARY KEY,
          transaction_id TEXT NOT NULL REFERENCES transactions(id),
          total_amount REAL NOT NULL,
          split_method TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          paid_by_type TEXT NOT NULL DEFAULT 'me',
          paid_by_friend_id TEXT REFERENCES friends(id),
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS split_participants (
          id TEXT PRIMARY KEY,
          split_expense_id TEXT NOT NULL REFERENCES split_expenses(id),
          friend_id TEXT REFERENCES friends(id),
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          is_paid INTEGER NOT NULL DEFAULT 0,
          settled_at TEXT
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Safe non-destructive column migrations for existing SQLite databases
      try {
        sqliteDb.execSync(`ALTER TABLE split_expenses ADD COLUMN paid_by_type TEXT NOT NULL DEFAULT 'me';`);
      } catch (_) {}
      try {
        sqliteDb.execSync(`ALTER TABLE split_expenses ADD COLUMN paid_by_friend_id TEXT;`);
      } catch (_) {}
    }
  },

  seedDefaultCategories() {
    const db = getDb();
    const existing = db.select().from(schema.categories).all();
    const existingKeys = new Set(
      existing.map((c) => `${c.name.trim().toLowerCase()}_${c.type.toLowerCase()}`)
    );

    const now = getTodayISO();
    for (const cat of ALL_DEFAULT_CATEGORIES) {
      const key = `${cat.name.trim().toLowerCase()}_${cat.type.toLowerCase()}`;
      if (!existingKeys.has(key)) {
        db.insert(schema.categories)
          .values({
            id: generateId(),
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
            isDefault: true,
            createdAt: now,
          })
          .run();
        existingKeys.add(key);
      }
    }
  },

  // ─── Accounts ────────────────────────────────────────────────────────
  getAccounts(): Account[] {
    const db = getDb();
    const results = db.select().from(schema.accounts).all();
    return results.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type as AccountType,
      balance: r.balance,
      icon: r.icon,
      color: r.color,
      isDefault: r.isDefault,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  addAccount(account: Account) {
    const db = getDb();
    db.insert(schema.accounts).values(account).run();
  },

  updateAccount(id: string, data: Partial<Account>) {
    const db = getDb();
    db.update(schema.accounts)
      .set(data as any)
      .where(eq(schema.accounts.id, id))
      .run();
  },

  deleteAccount(id: string) {
    const db = getDb();
    db.delete(schema.accounts).where(eq(schema.accounts.id, id)).run();
  },

  // ─── Categories ──────────────────────────────────────────────────────
  getCategories(): Category[] {
    const db = getDb();
    const results = db.select().from(schema.categories).all();
    return results.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      type: r.type as CategoryType,
      isDefault: r.isDefault,
      createdAt: r.createdAt,
    }));
  },

  addCategory(category: Category) {
    const db = getDb();
    db.insert(schema.categories).values(category).run();
  },

  updateCategory(id: string, data: Partial<Category>) {
    const db = getDb();
    db.update(schema.categories)
      .set(data as any)
      .where(eq(schema.categories.id, id))
      .run();
  },

  deleteCategory(id: string) {
    const db = getDb();
    db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
  },

  // ─── Transactions ────────────────────────────────────────────────────
  getTransactions(): Transaction[] {
    const db = getDb();
    const results = db
      .select()
      .from(schema.transactions)
      .orderBy(desc(schema.transactions.date))
      .all();
    return results.map((r) => ({
      id: r.id,
      type: r.type as TransactionType,
      amount: r.amount,
      categoryId: r.categoryId,
      accountId: r.accountId,
      toAccountId: r.toAccountId,
      note: r.note,
      date: r.date,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  },

  addTransaction(transaction: Transaction) {
    const db = getDb();
    db.insert(schema.transactions).values(transaction).run();
  },

  updateTransaction(id: string, data: Partial<Transaction>) {
    const db = getDb();
    db.update(schema.transactions)
      .set(data as any)
      .where(eq(schema.transactions.id, id))
      .run();
  },

  deleteTransaction(id: string) {
    const db = getDb();
    db.delete(schema.transactions).where(eq(schema.transactions.id, id)).run();
  },

  // ─── Friends ─────────────────────────────────────────────────────────
  getFriends(): Friend[] {
    const db = getDb();
    const results = db.select().from(schema.friends).all();
    return results.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      avatarColor: r.avatarColor,
      createdAt: r.createdAt,
    }));
  },

  addFriend(friend: Friend) {
    const db = getDb();
    db.insert(schema.friends).values(friend).run();
  },

  updateFriend(id: string, data: Partial<Friend>) {
    const db = getDb();
    db.update(schema.friends)
      .set(data as any)
      .where(eq(schema.friends.id, id))
      .run();
  },

  deleteFriend(id: string) {
    const db = getDb();
    db.delete(schema.friends).where(eq(schema.friends.id, id)).run();
  },

  // ─── Split Expenses ──────────────────────────────────────────────────
  getSplitExpenses(): SplitExpense[] {
    const db = getDb();
    const splits = db.select().from(schema.splitExpenses).all();
    const participants = db.select().from(schema.splitParticipants).all();

    return splits.map((s) => ({
      id: s.id,
      transactionId: s.transactionId,
      totalAmount: s.totalAmount,
      splitMethod: s.splitMethod as SplitMethod,
      status: s.status as SplitStatus,
      paidByType: (s.paidByType || 'me') as any,
      paidByFriendId: s.paidByFriendId,
      createdAt: s.createdAt,
      participants: participants
        .filter((p) => p.splitExpenseId === s.id)
        .map((p) => ({
          id: p.id,
          splitExpenseId: p.splitExpenseId,
          friendId: p.friendId,
          name: p.name,
          amount: p.amount,
          isPaid: p.isPaid,
          settledAt: p.settledAt,
        })),
    }));
  },

  addSplitExpense(
    split: Omit<SplitExpense, 'participants'>,
    participants: SplitParticipant[]
  ) {
    const db = getDb();
    db.insert(schema.splitExpenses).values(split).run();
    for (const p of participants) {
      db.insert(schema.splitParticipants).values(p).run();
    }
  },

  updateSplitExpense(
    id: string,
    data: Partial<Omit<SplitExpense, 'participants'>>,
    participants?: SplitParticipant[]
  ) {
    const db = getDb();
    db.update(schema.splitExpenses)
      .set(data as any)
      .where(eq(schema.splitExpenses.id, id))
      .run();

    if (participants) {
      for (const p of participants) {
        db.update(schema.splitParticipants)
          .set({ isPaid: p.isPaid, settledAt: p.settledAt, amount: p.amount })
          .where(eq(schema.splitParticipants.id, p.id))
          .run();
      }
    }
  },

  settleSplitParticipant(
    splitExpenseId: string,
    participantId: string,
    settledAt: string,
    newStatus: SplitStatus
  ) {
    const db = getDb();
    db.update(schema.splitParticipants)
      .set({ isPaid: true, settledAt })
      .where(eq(schema.splitParticipants.id, participantId))
      .run();

    db.update(schema.splitExpenses)
      .set({ status: newStatus })
      .where(eq(schema.splitExpenses.id, splitExpenseId))
      .run();
  },

  // ─── Settings ────────────────────────────────────────────────────────
  getSetting(key: string): string | null {
    const db = getDb();
    const res = db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).all();
    return res.length > 0 ? res[0].value : null;
  },

  setSetting(key: string, value: string): void {
    const db = getDb();
    const existing = db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).all();
    if (existing.length > 0) {
      db.update(schema.appSettings).set({ value }).where(eq(schema.appSettings.key, key)).run();
    } else {
      db.insert(schema.appSettings).values({ key, value }).run();
    }
  },

  getAppSettings() {
    const hasOnboardedStr = this.getSetting('hasOnboarded');
    const themeModeStr = this.getSetting('themeMode');
    const userNameStr = this.getSetting('userName');
    const currencyStr = this.getSetting('currency');

    return {
      hasOnboarded: hasOnboardedStr === 'true',
      themeMode: (themeModeStr as any) || 'light',
      userProfile: {
        name: userNameStr || '',
        currency: currencyStr || '₹',
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
      if (settings.userProfile.name !== undefined) {
        this.setSetting('userName', settings.userProfile.name);
      }
      if (settings.userProfile.currency !== undefined) {
        this.setSetting('currency', settings.userProfile.currency);
      }
    }
  },
};

