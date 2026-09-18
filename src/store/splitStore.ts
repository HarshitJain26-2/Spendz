import { create } from 'zustand';
import type {
  SplitExpense,
  SplitParticipant,
  SplitMethod,
  SplitStatus,
  PaidByType,
} from '@/types';
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
    paidByType?: PaidByType;
    paidByFriendId?: string | null;
    participants: Array<{
      friendId: string | null;
      name: string;
      amount: number;
    }>;
  }) => SplitExpense;
  updateSplitExpense: (
    splitExpenseId: string,
    data: Partial<Omit<SplitExpense, 'participants'>>,
    participants?: SplitParticipant[]
  ) => void;
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
    const paidByType: PaidByType = data.paidByType || 'me';
    const paidByFriendId = data.paidByFriendId || null;

    const participantRecords: SplitParticipant[] = data.participants.map((p) => {
      // If 'me' paid, 'you' (friendId === null) is marked paid.
      // If a friend paid, that specific friend (friendId === paidByFriendId) is marked paid.
      const isPaid =
        paidByType === 'me'
          ? p.friendId === null
          : p.friendId === paidByFriendId;

      return {
        id: generateId(),
        splitExpenseId: splitId,
        friendId: p.friendId,
        name: p.name,
        amount: p.amount,
        isPaid,
        settledAt: isPaid ? now : null,
      };
    });

    const splitExpense: SplitExpense = {
      id: splitId,
      transactionId: data.transactionId,
      totalAmount: data.totalAmount,
      splitMethod: data.splitMethod,
      status: 'pending',
      paidByType,
      paidByFriendId,
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
        paidByType,
        paidByFriendId,
        createdAt: now,
      },
      participantRecords
    );

    set((state) => ({
      splitExpenses: [...state.splitExpenses, splitExpense],
    }));

    return splitExpense;
  },

  updateSplitExpense: (splitExpenseId, data, participants) => {
    repository.updateSplitExpense(splitExpenseId, data, participants);

    set((state) => ({
      splitExpenses: state.splitExpenses.map((s) => {
        if (s.id !== splitExpenseId) return s;
        return {
          ...s,
          ...data,
          participants: participants || s.participants,
        };
      }),
    }));
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
    return get().splitExpenses.filter(
      (split) =>
        split.paidByFriendId === friendId ||
        split.participants?.some((p) => p.friendId === friendId)
    );
  },

  getFriendBalance: (friendId) => {
    // Positive = they owe you, negative = you owe them
    let balance = 0;
    for (const split of get().splitExpenses) {
      const paidByType = split.paidByType || 'me';

      if (paidByType === 'me') {
        // You paid: find friend's participant entry
        const participant = split.participants?.find(
          (p) => p.friendId === friendId
        );
        if (participant && !participant.isPaid) {
          balance += participant.amount;
        }
      } else if (paidByType === 'friend' && split.paidByFriendId === friendId) {
        // This friend paid: find "You" (friendId === null) entry
        const myParticipant = split.participants?.find(
          (p) => p.friendId === null
        );
        if (myParticipant && !myParticipant.isPaid) {
          balance -= myParticipant.amount;
        }
      }
      // If another friend paid (paidByFriendId !== friendId), neither you owe them nor they owe you
    }
    return balance;
  },

  getSplitByTransactionId: (transactionId) => {
    return get().splitExpenses.find((s) => s.transactionId === transactionId);
  },
}));
