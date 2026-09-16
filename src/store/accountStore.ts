import { create } from 'zustand';
import type { Account, AccountType } from '@/types';
import { getDatabase, schema } from '@/database';
import { eq } from 'drizzle-orm';
import { generateId, getTodayISO } from '@/utils/date';
import { isOnlineAccount } from '@/constants/accountTypes';

interface AccountState {
  accounts: Account[];
  isLoading: boolean;

  loadAccounts: () => void;
  addAccount: (data: {
    name: string;
    type: AccountType;
    balance: number;
    icon: string;
    color: string;
    isDefault?: boolean;
  }) => Account;
  updateAccount: (id: string, data: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  updateBalance: (id: string, delta: number) => void;

  // Computed
  getTotalBalance: () => number;
  getCashBalance: () => number;
  getOnlineBalance: () => number;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,

  loadAccounts: () => {
    try {
      const db = getDatabase();
      const results = db.select().from(schema.accounts).all();
      set({
        accounts: results.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type as AccountType,
          balance: r.balance,
          icon: r.icon,
          color: r.color,
          isDefault: r.isDefault,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
      });
    } catch (e) {
      console.error('Failed to load accounts:', e);
    }
  },

  addAccount: (data) => {
    const db = getDatabase();
    const now = getTodayISO();
    const account: Account = {
      id: generateId(),
      name: data.name,
      type: data.type,
      balance: data.balance,
      icon: data.icon,
      color: data.color,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(schema.accounts).values({
      ...account,
    }).run();

    set((state) => ({ accounts: [...state.accounts, account] }));
    return account;
  },

  updateAccount: (id, data) => {
    const db = getDatabase();
    const now = getTodayISO();

    db.update(schema.accounts)
      .set({ ...data, updatedAt: now } as any)
      .where(eq(schema.accounts.id, id))
      .run();

    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...data, updatedAt: now } : a
      ),
    }));
  },

  deleteAccount: (id) => {
    const db = getDatabase();
    db.delete(schema.accounts).where(eq(schema.accounts.id, id)).run();
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    }));
  },

  updateBalance: (id, delta) => {
    const account = get().accounts.find((a) => a.id === id);
    if (!account) return;

    const newBalance = account.balance + delta;
    get().updateAccount(id, { balance: newBalance });
  },

  getTotalBalance: () => {
    return get().accounts.reduce((sum, a) => sum + a.balance, 0);
  },

  getCashBalance: () => {
    return get()
      .accounts.filter((a) => a.type === 'cash')
      .reduce((sum, a) => sum + a.balance, 0);
  },

  getOnlineBalance: () => {
    return get()
      .accounts.filter((a) => isOnlineAccount(a.type))
      .reduce((sum, a) => sum + a.balance, 0);
  },
}));
