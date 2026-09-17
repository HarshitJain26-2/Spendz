import { create } from 'zustand';
import type { Account, AccountType } from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO } from '@/utils/date';
import { isCashAccount, isOnlineAccount } from '@/constants/accountTypes';

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
      const accounts = repository.getAccounts();
      set({ accounts });
    } catch (e) {
      console.error('Failed to load accounts:', e);
    }
  },

  addAccount: (data) => {
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

    repository.addAccount(account);
    set((state) => ({ accounts: [...state.accounts, account] }));
    return account;
  },

  updateAccount: (id, data) => {
    const now = getTodayISO();
    repository.updateAccount(id, { ...data, updatedAt: now });

    set((state) => ({
      accounts: state.accounts.map((a) =>
        a.id === id ? { ...a, ...data, updatedAt: now } : a
      ),
    }));
  },

  deleteAccount: (id) => {
    repository.deleteAccount(id);
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
    return get().accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  },

  getCashBalance: () => {
    return get()
      .accounts.filter((a) => isCashAccount(a.type))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  },

  getOnlineBalance: () => {
    return get()
      .accounts.filter((a) => isOnlineAccount(a.type))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  },
}));
