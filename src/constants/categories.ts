import type { CategoryType } from '../types';

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#FF6B6B', type: 'expense' },
  { name: 'Transport', icon: 'Car', color: '#4ECDC4', type: 'expense' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#FFE66D', type: 'expense' },
  { name: 'Bills & Utilities', icon: 'Receipt', color: '#A78BFA', type: 'expense' },
  { name: 'Entertainment', icon: 'Gamepad2', color: '#F472B6', type: 'expense' },
  { name: 'Education', icon: 'GraduationCap', color: '#60A5FA', type: 'expense' },
  { name: 'Health', icon: 'Heart', color: '#34D399', type: 'expense' },
  { name: 'Travel', icon: 'Plane', color: '#FB923C', type: 'expense' },
  { name: 'Gifts', icon: 'Gift', color: '#E879F9', type: 'expense' },
  { name: 'Groceries', icon: 'Apple', color: '#F97316', type: 'expense' },
  { name: 'Rent', icon: 'Home', color: '#8B5CF6', type: 'expense' },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#06B6D4', type: 'expense' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#94A3B8', type: 'expense' },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { name: 'Salary', icon: 'Banknote', color: '#22C55E', type: 'income' },
  { name: 'Freelance', icon: 'Laptop', color: '#10B981', type: 'income' },
  { name: 'Investment', icon: 'TrendingUp', color: '#6366F1', type: 'income' },
  { name: 'Refund', icon: 'RotateCcw', color: '#F59E0B', type: 'income' },
  { name: 'Gift Received', icon: 'Gift', color: '#EC4899', type: 'income' },
  { name: 'Other Income', icon: 'Plus', color: '#94A3B8', type: 'income' },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
