import type { AccountType } from '../types';

export interface AccountTypeConfig {
  type: AccountType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const ACCOUNT_TYPES: AccountTypeConfig[] = [
  {
    type: 'cash',
    label: 'Cash',
    icon: 'Banknote',
    color: '#22C55E',
    description: 'Physical cash in hand',
  },
  {
    type: 'bank',
    label: 'Bank Account',
    icon: 'Building2',
    color: '#3B82F6',
    description: 'Savings or current account',
  },
  {
    type: 'wallet',
    label: 'Digital Wallet',
    icon: 'Wallet',
    color: '#8B5CF6',
    description: 'PayTM, PhonePe, GPay, etc.',
  },
  {
    type: 'card',
    label: 'Credit Card',
    icon: 'CreditCard',
    color: '#EF4444',
    description: 'Credit or debit card',
  },
  {
    type: 'custom',
    label: 'Other',
    icon: 'Folder',
    color: '#94A3B8',
    description: 'Custom account type',
  },
];

export const getAccountTypeConfig = (type: AccountType): AccountTypeConfig => {
  return ACCOUNT_TYPES.find((t) => t.type === type) ?? ACCOUNT_TYPES[4];
};

/** Returns true if this account type represents "online" money */
export const isOnlineAccount = (type: AccountType): boolean => {
  return type === 'bank' || type === 'wallet' || type === 'card';
};
