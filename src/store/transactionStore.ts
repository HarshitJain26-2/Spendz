import { create } from 'zustand';
import type { Transaction, TransactionType, MonthSummary } from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO, getMonthKey, getCurrentMonthRange } from '@/utils/date';
import { getUserPersonalExpense } from '@/utils/calculations';
import { useAccountStore } from './accountStore';
import { useSplitStore } from './splitStore';

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
    skipBalanceUpdate?: boolean;
  }) => Transaction;
  updateTransaction: (
    id: string,
    data: Partial<Transaction>,
    options?: { skipBalanceUpdate?: boolean; wasPaidByFriend?: boolean }
  ) => void;
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
      const transactions = repository.getTransactions();
      set({ transactions });
    } catch (e) {
      console.error('Failed to load transactions:', e);
    }
  },

  addTransaction: (data) => {
    const now = getTodayISO();
    const transaction: Transaction = {
      id: generateId(),
      type: data.type,
      amount: data.amount,
      categoryId: data.categoryId,
      accountId: data.accountId,
      toAccountId: data.toAccountId || null,
      note: data.note,
      date: data.date,
      createdAt: now,
      updatedAt: now,
    };

    repository.addTransaction({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
      note: transaction.note,
      date: transaction.date,
      createdAt: now,
      updatedAt: now,
    });

    // Update account balances only if skipBalanceUpdate is false
    if (!data.skipBalanceUpdate) {
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
    }

    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));

    return transaction;
  },

  updateTransaction: (id, data, options) => {
    const now = getTodayISO();

    // Get existing transaction to reverse its balance effect
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;

    const accountStore = useAccountStore.getState();
    const split = useSplitStore.getState().splitExpenses.find((s) => s.transactionId === id);
    const wasPaidByFriend =
      options?.wasPaidByFriend !== undefined
        ? options.wasPaidByFriend
        : split?.paidByType === 'friend';

    // Reverse old balance effect only if user actually paid for it (not paid by friend)
    if (!wasPaidByFriend) {
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
    }

    const updated = { ...existing, ...data, updatedAt: now };

    repository.updateTransaction(id, { ...data, updatedAt: now });

    // Apply new balance effect only if not skipped (e.g. friend paid)
    if (!options?.skipBalanceUpdate) {
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

    const split = useSplitStore.getState().splitExpenses.find((s) => s.transactionId === id);
    const wasPaidByFriend = split?.paidByType === 'friend';

    // Only reverse account balance if user paid for this transaction
    if (!wasPaidByFriend) {
      const accountStore = useAccountStore.getState();
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
    }

    // Immediately update splitStore in-memory state if there is a linked split
    if (split) {
      useSplitStore.setState((state) => ({
        splitExpenses: state.splitExpenses.filter((s) => s.transactionId !== id),
      }));
    }

    repository.deleteTransaction(id);

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
    const splitExpenses = useSplitStore.getState().splitExpenses;

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => {
        const split = splitExpenses.find((s) => s.transactionId === t.id);
        return sum + getUserPersonalExpense(t, split);
      }, 0);

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
