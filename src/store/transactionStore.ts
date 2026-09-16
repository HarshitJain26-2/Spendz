import { create } from 'zustand';
import type { Transaction, TransactionType, MonthSummary } from '@/types';
import { getDatabase, schema } from '@/database';
import { eq, desc, and, gte, lte, like } from 'drizzle-orm';
import { generateId, getTodayISO, getMonthKey, getCurrentMonthRange } from '@/utils/date';
import { useAccountStore } from './accountStore';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;

  loadTransactions: () => void;
  addTransaction: (data: {
    type: TransactionType;
    amount: number;
    categoryId: string | null;
    accountId: string;
    toAccountId?: string | null;
    note: string;
    date: string;
  }) => Transaction;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  getRecentTransactions: (limit?: number) => Transaction[];
  getTransactionsByMonth: (monthKey: string) => Transaction[];
  getCurrentMonthSummary: () => MonthSummary;
  searchTransactions: (query: string) => Transaction[];
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  loadTransactions: () => {
    try {
      const db = getDatabase();
      const results = db
        .select()
        .from(schema.transactions)
        .orderBy(desc(schema.transactions.date))
        .all();

      set({
        transactions: results.map((r) => ({
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
        })),
      });
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  },

  addTransaction: (data) => {
    const db = getDatabase();
    const now = getTodayISO();
    const transaction: Transaction = {
      id: generateId(),
      type: data.type,
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId,
      toAccountId: data.toAccountId ?? null,
      note: data.note,
      date: data.date,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(schema.transactions).values(transaction).run();

    // Update account balances
    const accountStore = useAccountStore.getState();
    switch (data.type) {
      case 'expense':
        accountStore.updateBalance(data.accountId, -data.amount);
        break;
      case 'income':
        accountStore.updateBalance(data.accountId, data.amount);
        break;
      case 'transfer':
        if (data.toAccountId) {
          accountStore.updateBalance(data.accountId, -data.amount);
          accountStore.updateBalance(data.toAccountId, data.amount);
        }
        break;
    }

    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));

    return transaction;
  },

  updateTransaction: (id, data) => {
    const db = getDatabase();
    const now = getTodayISO();

    // Get existing transaction to reverse its balance effect
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;

    const accountStore = useAccountStore.getState();

    // Reverse old balance effect
    switch (existing.type) {
      case 'expense':
        accountStore.updateBalance(existing.accountId, existing.amount);
        break;
      case 'income':
        accountStore.updateBalance(existing.accountId, -existing.amount);
        break;
      case 'transfer':
        if (existing.toAccountId) {
          accountStore.updateBalance(existing.accountId, existing.amount);
          accountStore.updateBalance(existing.toAccountId, -existing.amount);
        }
        break;
    }

    const updated = { ...existing, ...data, updatedAt: now };

    db.update(schema.transactions)
      .set({ ...data, updatedAt: now } as any)
      .where(eq(schema.transactions.id, id))
      .run();

    // Apply new balance effect
    switch (updated.type) {
      case 'expense':
        accountStore.updateBalance(updated.accountId, -updated.amount);
        break;
      case 'income':
        accountStore.updateBalance(updated.accountId, updated.amount);
        break;
      case 'transfer':
        if (updated.toAccountId) {
          accountStore.updateBalance(updated.accountId, -updated.amount);
          accountStore.updateBalance(updated.toAccountId, updated.amount);
        }
        break;
    }

    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? updated : t
      ),
    }));
  },

  deleteTransaction: (id) => {
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;

    const db = getDatabase();
    const accountStore = useAccountStore.getState();

    // Reverse balance effect
    switch (existing.type) {
      case 'expense':
        accountStore.updateBalance(existing.accountId, existing.amount);
        break;
      case 'income':
        accountStore.updateBalance(existing.accountId, -existing.amount);
        break;
      case 'transfer':
        if (existing.toAccountId) {
          accountStore.updateBalance(existing.accountId, existing.amount);
          accountStore.updateBalance(existing.toAccountId, -existing.amount);
        }
        break;
    }

    db.delete(schema.transactions)
      .where(eq(schema.transactions.id, id))
      .run();

    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  getRecentTransactions: (limit = 5) => {
    return get().transactions.slice(0, limit);
  },

  getTransactionsByMonth: (monthKey) => {
    return get().transactions.filter(
      (t) => getMonthKey(t.date) === monthKey
    );
  },

  getCurrentMonthSummary: () => {
    const { start, end } = getCurrentMonthRange();
    const monthTransactions = get().transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      saved: income - expense,
    };
  },

  searchTransactions: (query) => {
    const q = query.toLowerCase();
    return get().transactions.filter(
      (t) =>
        t.note.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q)
    );
  },
}));
