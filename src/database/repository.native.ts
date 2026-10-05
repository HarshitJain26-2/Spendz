import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { eq, desc, and } from 'drizzle-orm';
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
  Group,
  GroupMember,
  GroupExpense,
  GroupExpenseParticipant,
  GroupSettlement,
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

        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT '🏖',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_members (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL REFERENCES groups(id),
          friend_id TEXT REFERENCES friends(id),
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_expenses (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL REFERENCES groups(id),
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          paid_by_friend_id TEXT REFERENCES friends(id),
          date TEXT NOT NULL,
          split_method TEXT NOT NULL DEFAULT 'equal',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_expense_participants (
          id TEXT PRIMARY KEY,
          group_expense_id TEXT NOT NULL REFERENCES group_expenses(id),
          friend_id TEXT REFERENCES friends(id),
          share_amount REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS group_settlements (
          id TEXT PRIMARY KEY,
          group_id TEXT NOT NULL REFERENCES groups(id),
          from_friend_id TEXT REFERENCES friends(id),
          to_friend_id TEXT REFERENCES friends(id),
          amount REAL NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT NOT NULL
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

      // Safe cleanup of any orphaned split records whose transaction_id no longer exists
      try {
        sqliteDb.execSync(`
          DELETE FROM split_participants WHERE split_expense_id IN (
            SELECT se.id FROM split_expenses se LEFT JOIN transactions t ON se.transaction_id = t.id WHERE t.id IS NULL
          );
          DELETE FROM split_expenses WHERE transaction_id NOT IN (SELECT id FROM transactions);
        `);
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
    // Cascade-delete linked split expenses & participants idempotently
    this.deleteSplitByTransactionId(id);
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

    if (data.name) {
      db.update(schema.splitParticipants)
        .set({ name: data.name })
        .where(eq(schema.splitParticipants.friendId, id))
        .run();
    }
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
      db.delete(schema.splitParticipants)
        .where(eq(schema.splitParticipants.splitExpenseId, id))
        .run();
      for (const p of participants) {
        db.insert(schema.splitParticipants).values(p).run();
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

  deleteSplitExpense(id: string) {
    const db = getDb();
    db.delete(schema.splitParticipants)
      .where(eq(schema.splitParticipants.splitExpenseId, id))
      .run();
    db.delete(schema.splitExpenses)
      .where(eq(schema.splitExpenses.id, id))
      .run();
  },

  deleteSplitByTransactionId(transactionId: string) {
    const db = getDb();
    const linkedSplits = db
      .select({ id: schema.splitExpenses.id })
      .from(schema.splitExpenses)
      .where(eq(schema.splitExpenses.transactionId, transactionId))
      .all();

    for (const s of linkedSplits) {
      this.deleteSplitExpense(s.id);
    }
  },

  // ─── Groups ──────────────────────────────────────────────────────────
  getGroups(): Group[] {
    const db = getDb();
    const groupRows = db.select().from(schema.groups).all();
    const memberRows = db.select().from(schema.groupMembers).all();
    const friendRows = db.select().from(schema.friends).all();
    const friendMap = new Map(friendRows.map((f) => [f.id, f]));

    return groupRows.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      members: memberRows
        .filter((m) => m.groupId === g.id)
        .map((m) => ({
          id: m.id,
          groupId: m.groupId,
          friendId: m.friendId,
          createdAt: m.createdAt,
          friend: m.friendId ? friendMap.get(m.friendId) || null : null,
        })),
    }));
  },

  addGroup(group: Group, members: GroupMember[]) {
    const db = getDb();
    db.insert(schema.groups).values({
      id: group.id,
      name: group.name,
      icon: group.icon,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }).run();

    for (const m of members) {
      db.insert(schema.groupMembers).values({
        id: m.id,
        groupId: m.groupId,
        friendId: m.friendId,
        createdAt: m.createdAt,
      }).run();
    }
  },

  updateGroup(id: string, data: Partial<Group>) {
    const db = getDb();
    db.update(schema.groups)
      .set(data as any)
      .where(eq(schema.groups.id, id))
      .run();
  },

  deleteGroup(id: string) {
    const db = getDb();
    // Delete expense participants first
    const expenses = db
      .select({ id: schema.groupExpenses.id })
      .from(schema.groupExpenses)
      .where(eq(schema.groupExpenses.groupId, id))
      .all();

    for (const exp of expenses) {
      db.delete(schema.groupExpenseParticipants)
        .where(eq(schema.groupExpenseParticipants.groupExpenseId, exp.id))
        .run();
    }

    // Delete group expenses
    db.delete(schema.groupExpenses).where(eq(schema.groupExpenses.groupId, id)).run();

    // Delete settlements
    db.delete(schema.groupSettlements).where(eq(schema.groupSettlements.groupId, id)).run();

    // Delete members
    db.delete(schema.groupMembers).where(eq(schema.groupMembers.groupId, id)).run();

    // Delete group
    db.delete(schema.groups).where(eq(schema.groups.id, id)).run();
  },

  addGroupMember(member: GroupMember) {
    const db = getDb();
    db.insert(schema.groupMembers).values({
      id: member.id,
      groupId: member.groupId,
      friendId: member.friendId,
      createdAt: member.createdAt,
    }).run();
  },

  removeGroupMember(groupId: string, friendId: string | null) {
    const db = getDb();
    const allMembers = db
      .select()
      .from(schema.groupMembers)
      .where(eq(schema.groupMembers.groupId, groupId))
      .all();

    const target = allMembers.find((m) => m.friendId === friendId);
    if (target) {
      db.delete(schema.groupMembers)
        .where(eq(schema.groupMembers.id, target.id))
        .run();
    }
  },

  // ─── Group Expenses ──────────────────────────────────────────────────
  getGroupExpenses(groupId?: string): GroupExpense[] {
    const db = getDb();
    const query = groupId
      ? db.select().from(schema.groupExpenses).where(eq(schema.groupExpenses.groupId, groupId)).orderBy(desc(schema.groupExpenses.date))
      : db.select().from(schema.groupExpenses).orderBy(desc(schema.groupExpenses.date));
    const expenseRows = query.all();

    const participantRows = db.select().from(schema.groupExpenseParticipants).all();
    const friendRows = db.select().from(schema.friends).all();
    const friendMap = new Map(friendRows.map((f) => [f.id, f]));

    return expenseRows.map((e) => ({
      id: e.id,
      groupId: e.groupId,
      description: e.description,
      amount: e.amount,
      paidByFriendId: e.paidByFriendId,
      date: e.date,
      splitMethod: (e.splitMethod as any) || 'equal',
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      paidByFriend: e.paidByFriendId ? friendMap.get(e.paidByFriendId) || null : null,
      participants: participantRows
        .filter((p) => p.groupExpenseId === e.id)
        .map((p) => ({
          id: p.id,
          groupExpenseId: p.groupExpenseId,
          friendId: p.friendId,
          shareAmount: p.shareAmount,
          friend: p.friendId ? friendMap.get(p.friendId) || null : null,
        })),
    }));
  },

  addGroupExpense(
    expense: Omit<GroupExpense, 'participants'>,
    participants: GroupExpenseParticipant[]
  ) {
    const db = getDb();
    db.insert(schema.groupExpenses).values({
      id: expense.id,
      groupId: expense.groupId,
      description: expense.description,
      amount: expense.amount,
      paidByFriendId: expense.paidByFriendId,
      date: expense.date,
      splitMethod: expense.splitMethod,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    }).run();

    for (const p of participants) {
      db.insert(schema.groupExpenseParticipants).values({
        id: p.id,
        groupExpenseId: p.groupExpenseId,
        friendId: p.friendId,
        shareAmount: p.shareAmount,
      }).run();
    }
  },

  updateGroupExpense(
    id: string,
    data: Partial<Omit<GroupExpense, 'participants'>>,
    participants?: GroupExpenseParticipant[]
  ) {
    const db = getDb();
    db.update(schema.groupExpenses)
      .set(data as any)
      .where(eq(schema.groupExpenses.id, id))
      .run();

    if (participants) {
      db.delete(schema.groupExpenseParticipants)
        .where(eq(schema.groupExpenseParticipants.groupExpenseId, id))
        .run();

      for (const p of participants) {
        db.insert(schema.groupExpenseParticipants).values({
          id: p.id,
          groupExpenseId: p.groupExpenseId,
          friendId: p.friendId,
          shareAmount: p.shareAmount,
        }).run();
      }
    }
  },

  deleteGroupExpense(id: string) {
    const db = getDb();
    db.delete(schema.groupExpenseParticipants)
      .where(eq(schema.groupExpenseParticipants.groupExpenseId, id))
      .run();
    db.delete(schema.groupExpenses)
      .where(eq(schema.groupExpenses.id, id))
      .run();
  },

  // ─── Group Settlements ───────────────────────────────────────────────
  getGroupSettlements(groupId?: string): GroupSettlement[] {
    const db = getDb();
    const query = groupId
      ? db.select().from(schema.groupSettlements).where(eq(schema.groupSettlements.groupId, groupId)).orderBy(desc(schema.groupSettlements.date))
      : db.select().from(schema.groupSettlements).orderBy(desc(schema.groupSettlements.date));
    const settlementRows = query.all();

    const friendRows = db.select().from(schema.friends).all();
    const friendMap = new Map(friendRows.map((f) => [f.id, f]));

    return settlementRows.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      fromFriendId: s.fromFriendId,
      toFriendId: s.toFriendId,
      amount: s.amount,
      date: s.date,
      createdAt: s.createdAt,
      fromFriend: s.fromFriendId ? friendMap.get(s.fromFriendId) || null : null,
      toFriend: s.toFriendId ? friendMap.get(s.toFriendId) || null : null,
    }));
  },

  addGroupSettlement(settlement: GroupSettlement) {
    const db = getDb();
    db.insert(schema.groupSettlements).values({
      id: settlement.id,
      groupId: settlement.groupId,
      fromFriendId: settlement.fromFriendId,
      toFriendId: settlement.toFriendId,
      amount: settlement.amount,
      date: settlement.date,
      createdAt: settlement.createdAt,
    }).run();
  },

  deleteGroupSettlement(id: string) {
    const db = getDb();
    db.delete(schema.groupSettlements)
      .where(eq(schema.groupSettlements.id, id))
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

