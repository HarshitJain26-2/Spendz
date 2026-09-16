import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const DB_NAME = 'spendz.db';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteDb: SQLite.SQLiteDatabase | null = null;

export const getDatabase = () => {
  if (!dbInstance) {
    sqliteDb = SQLite.openDatabaseSync(DB_NAME);
    dbInstance = drizzle(sqliteDb, { schema });
  }
  return dbInstance;
};

export const initializeDatabase = async () => {
  const db = getDatabase();

  // Create tables if they don't exist
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
    `);
  }

  return db;
};

export { schema };
