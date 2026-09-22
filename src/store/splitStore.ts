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
  deleteSplitExpense: (splitExpenseId: string) => void;
  deleteSplitByTransactionId: (transactionId: string) => void;
  getSplitsByFriend: (friendId: string) => SplitExpense[];
  getFriendBalance: (friendId: string) => number;
  getSplitByTransactionId: (transactionId: string) => SplitExpense | undefined;
  updateFriendName: (friendId: string, name: string) => void;
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
    const totalAmount = Number(data.totalAmount) || 0;

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
        amount: Number(p.amount) || 0,
        isPaid,
        settledAt: isPaid ? now : null,
      };
    });

    const splitExpense: SplitExpense = {
      id: splitId,
      transactionId: data.transactionId,
      totalAmount,
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
        totalAmount,
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
    const sanitizedData = {
      ...data,
      ...(data.totalAmount !== undefined ? { totalAmount: Number(data.totalAmount) || 0 } : {}),
    };

    const sanitizedParticipants = participants?.map((p) => ({
      ...p,
      amount: Number(p.amount) || 0,
    }));

    repository.updateSplitExpense(splitExpenseId, sanitizedData, sanitizedParticipants);

    set((state) => ({
      splitExpenses: state.splitExpenses.map((s) => {
        if (s.id !== splitExpenseId) return s;
        return {
          ...s,
          ...sanitizedData,
          participants: sanitizedParticipants || s.participants,
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

  deleteSplitExpense: (splitExpenseId) => {
    repository.deleteSplitExpense(splitExpenseId);
    set((state) => ({
      splitExpenses: state.splitExpenses.filter((s) => s.id !== splitExpenseId),
    }));
  },

  deleteSplitByTransactionId: (transactionId) => {
    repository.deleteSplitByTransactionId(transactionId);
    set((state) => ({
      splitExpenses: state.splitExpenses.filter(
        (s) => s.transactionId !== transactionId
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

    // Cross-check parent transactions so deleted transactions never keep phantom friend balances
    let validTxIds: Set<string> | null = null;
    try {
      const { useTransactionStore } = require('./transactionStore');
      const txs = useTransactionStore.getState().transactions;
      if (Array.isArray(txs)) {
        validTxIds = new Set(txs.map((t: any) => t.id));
      }
    } catch {
      validTxIds = null;
    }

    for (const split of get().splitExpenses) {
      if (validTxIds && !validTxIds.has(split.transactionId)) {
        continue;
      }
      const paidByType = split.paidByType || 'me';

      if (paidByType === 'me') {
        // You paid: find friend's participant entry
        const participant = split.participants?.find(
          (p) => p.friendId === friendId
        );
        if (participant && !participant.isPaid) {
          balance += Number(participant.amount) || 0;
        }
      } else if (paidByType === 'friend' && split.paidByFriendId === friendId) {
        // This friend paid: find "You" (friendId === null) entry
        const myParticipant = split.participants?.find(
          (p) => p.friendId === null
        );
        if (myParticipant && !myParticipant.isPaid) {
          balance -= Number(myParticipant.amount) || 0;
        }
      }
      // If another friend paid (paidByFriendId !== friendId), neither you owe them nor they owe you
    }
    return balance;
  },

  getSplitByTransactionId: (transactionId) => {
    return get().splitExpenses.find((s) => s.transactionId === transactionId);
  },

  updateFriendName: (friendId, name) => {
    set((state) => ({
      splitExpenses: state.splitExpenses.map((s) => ({
        ...s,
        participants: s.participants?.map((p) =>
          p.friendId === friendId ? { ...p, name } : p
        ),
      })),
    }));
  },
}));
