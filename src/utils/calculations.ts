import type { SplitMethod, SplitExpense } from '../types';

/**
 * Calculate equal split amounts
 * Handles rounding so the total always adds up exactly
 */
export const calculateEqualSplit = (
  totalAmount: number,
  participantCount: number
): number[] => {
  if (participantCount <= 0) return [];

  const baseAmount = Math.floor((totalAmount * 100) / participantCount) / 100;
  const remainder = Math.round((totalAmount - baseAmount * participantCount) * 100);

  return Array.from({ length: participantCount }, (_, i) =>
    i < remainder ? baseAmount + 0.01 : baseAmount
  );
};

/**
 * Validate custom split amounts
 * Returns null if valid, error message if invalid
 */
export const validateCustomSplit = (
  totalAmount: number,
  amounts: number[]
): string | null => {
  const sum = amounts.reduce((a, b) => a + b, 0);
  const diff = Math.abs(sum - totalAmount);

  if (diff > 0.01) {
    const remaining = totalAmount - sum;
    return remaining > 0
      ? `₹${remaining.toFixed(2)} remaining to allocate`
      : `₹${Math.abs(remaining).toFixed(2)} over-allocated`;
  }

  if (amounts.some((a) => a < 0)) {
    return 'Amounts cannot be negative';
  }

  return null;
};

/**
 * Calculate net balance with a friend
 * Positive = they owe you, Negative = you owe them
 */
export const calculateNetBalance = (
  youPaid: number,
  theyPaid: number,
  yourShare: number,
  theirShare: number
): number => {
  // What you paid for them minus what they paid for you
  return (youPaid - yourShare) - (theyPaid - theirShare);
};

/**
 * Get balance display info
 */
export const getBalanceInfo = (balance: number): {
  label: string;
  color: 'income' | 'expense' | 'textSecondary';
  absAmount: number;
} => {
  if (balance > 0) {
    return { label: 'owes you', color: 'income', absAmount: balance };
  }
  if (balance < 0) {
    return { label: 'you owe', color: 'expense', absAmount: Math.abs(balance) };
  }
  return { label: 'settled up', color: 'textSecondary', absAmount: 0 };
};

/**
 * Get user's personal expense amount for a transaction.
 * If transaction is linked to a split expense:
 * - The personal share is derived from "You" participant (friendId === null)
 * If not linked to a split: full transaction amount
 */
export const getUserPersonalExpense = (
  transaction: { type: string; amount: number },
  split?: SplitExpense
): number => {
  if (transaction.type !== 'expense') return 0;
  if (!split) return transaction.amount;

  const myPart = split.participants?.find((p) => p.friendId === null);
  if (myPart) {
    return myPart.amount;
  }
  if (split.paidByType === 'friend') {
    return 0;
  }
  // Paid by Me, but Me is not a participant: friends owe 100% of it, personal share is 0
  return 0;
};
