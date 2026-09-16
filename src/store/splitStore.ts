import { create } from 'zustand';
import type { SplitExpense, SplitParticipant, SplitMethod, SplitStatus } from '@/types';
import { repository } from '@/database';
import { generateId, getTodayISO } from '@/utils/date';

interface SplitState {
  splitExpenses: SplitExpense[];
  isLoading: boolean;

  loadSplitExpenses: () => void;
  addSplitExpense: (data: {
    transactionId: string;
    totalAmount: number;
    splitMethod: SplitMethod;
    participants: Array<{
      friendId: string | null;
      name: string;
      amount: number;
    }>;
  }) => SplitExpense;
  settleSplitParticipant: (splitExpenseId: string, participantId: string) => void;
  getSplitsByFriend: (friendId: string) => SplitExpense[];
  getFriendBalance: (friendId: string) => number;
  getSplitByTransactionId: (transactionId: string) => SplitExpense | undefined;
}

export const useSplitStore = create<SplitState>((set, get) => ({
  splitExpenses: [],
  isLoading: false,

  loadSplitExpenses: () => {
    try {
      const splitExpenses = repository.getSplitExpenses();
      set({ splitExpenses });
    } catch (e) {
      console.error('Failed to load split expenses:', e);
    }
  },

  addSplitExpense: (data) => {
    const now = getTodayISO();
    const splitId = generateId();

    const participantRecords: SplitParticipant[] = data.participants.map((p) => ({
      id: generateId(),
      splitExpenseId: splitId,
      friendId: p.friendId,
      name: p.name,
      amount: p.amount,
      isPaid: p.friendId === null, // "you" are automatically paid
      settledAt: p.friendId === null ? now : null,
    }));

    const splitExpense: SplitExpense = {
      id: splitId,
      transactionId: data.transactionId,
      totalAmount: data.totalAmount,
      splitMethod: data.splitMethod,
      status: 'pending',
      createdAt: now,
      participants: participantRecords,
    };

    repository.addSplitExpense(
      {
        id: splitId,
        transactionId: data.transactionId,
        totalAmount: data.totalAmount,
        splitMethod: data.splitMethod,
        status: 'pending',
        createdAt: now,
      },
      participantRecords
    );

    set((state) => ({
      splitExpenses: [...state.splitExpenses, splitExpense],
    }));

    return splitExpense;
  },

  settleSplitParticipant: (splitExpenseId, participantId) => {
    const now = getTodayISO();
    const split = get().splitExpenses.find((s) => s.id === splitExpenseId);
    if (!split) return;

    const updatedParticipants = split.participants?.map((p) =>
      p.id === participantId
        ? { ...p, isPaid: true, settledAt: now }
        : p
    );

    const allPaid = updatedParticipants?.every((p) => p.isPaid);
    const somePaid = updatedParticipants?.some((p) => p.isPaid);

    const newStatus: SplitStatus = allPaid
      ? 'settled'
      : somePaid
        ? 'partial'
        : 'pending';

    repository.settleSplitParticipant(splitExpenseId, participantId, now, newStatus);

    set((state) => ({
      splitExpenses: state.splitExpenses.map((s) =>
        s.id === splitExpenseId
          ? {
              ...s,
              status: newStatus,
              participants: updatedParticipants,
            }
          : s
      ),
    }));
  },

  getSplitsByFriend: (friendId) => {
    return get().splitExpenses.filter((split) =>
      split.participants?.some((p) => p.friendId === friendId)
    );
  },

  getFriendBalance: (friendId) => {
    // Positive = they owe you, negative = you owe them
    let balance = 0;
    for (const split of get().splitExpenses) {
      const participant = split.participants?.find(
        (p) => p.friendId === friendId
      );
      if (participant && !participant.isPaid) {
        balance += participant.amount;
      }
    }
    return balance;
  },

  getSplitByTransactionId: (transactionId) => {
    return get().splitExpenses.find((s) => s.transactionId === transactionId);
  },
}));
