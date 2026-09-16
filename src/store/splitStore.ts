import { create } from 'zustand';
import type { SplitExpense, SplitParticipant, SplitMethod, SplitStatus } from '@/types';
import { getDatabase, schema } from '@/database';
import { eq } from 'drizzle-orm';
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
      const db = getDatabase();
      const splits = db.select().from(schema.splitExpenses).all();
      const participants = db.select().from(schema.splitParticipants).all();

      const splitExpenses: SplitExpense[] = splits.map((s) => ({
        id: s.id,
        transactionId: s.transactionId,
        totalAmount: s.totalAmount,
        splitMethod: s.splitMethod as SplitMethod,
        status: s.status as SplitStatus,
        createdAt: s.createdAt,
        participants: participants
          .filter((p) => p.splitExpenseId === s.id)
          .map((p) => ({
            id: p.id,
            splitExpenseId: p.splitExpenseId,
            friendId: p.friendId,
            name: p.name,
            amount: p.amount,
            isPaid: p.isPaid,
            settledAt: p.settledAt,
          })),
      }));

      set({ splitExpenses });
    } catch (e) {
      console.error('Failed to load split expenses:', e);
    }
  },

  addSplitExpense: (data) => {
    const db = getDatabase();
    const now = getTodayISO();
    const splitId = generateId();

    const splitExpense: SplitExpense = {
      id: splitId,
      transactionId: data.transactionId,
      totalAmount: data.totalAmount,
      splitMethod: data.splitMethod,
      status: 'pending',
      createdAt: now,
      participants: [],
    };

    db.insert(schema.splitExpenses)
      .values({
        id: splitId,
        transactionId: data.transactionId,
        totalAmount: data.totalAmount,
        splitMethod: data.splitMethod,
        status: 'pending',
        createdAt: now,
      })
      .run();

    const participantRecords: SplitParticipant[] = data.participants.map((p) => {
      const participant: SplitParticipant = {
        id: generateId(),
        splitExpenseId: splitId,
        friendId: p.friendId,
        name: p.name,
        amount: p.amount,
        isPaid: p.friendId === null, // "you" are automatically paid
        settledAt: p.friendId === null ? now : null,
      };

      db.insert(schema.splitParticipants).values(participant).run();
      return participant;
    });

    splitExpense.participants = participantRecords;

    set((state) => ({
      splitExpenses: [...state.splitExpenses, splitExpense],
    }));

    return splitExpense;
  },

  settleSplitParticipant: (splitExpenseId, participantId) => {
    const db = getDatabase();
    const now = getTodayISO();

    db.update(schema.splitParticipants)
      .set({ isPaid: true, settledAt: now })
      .where(eq(schema.splitParticipants.id, participantId))
      .run();

    set((state) => {
      const updated = state.splitExpenses.map((split) => {
        if (split.id !== splitExpenseId) return split;

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

        if (newStatus !== split.status) {
          db.update(schema.splitExpenses)
            .set({ status: newStatus })
            .where(eq(schema.splitExpenses.id, splitExpenseId))
            .run();
        }

        return {
          ...split,
          status: newStatus,
          participants: updatedParticipants,
        };
      });

      return { splitExpenses: updated };
    });
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
