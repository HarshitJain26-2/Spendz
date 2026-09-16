import { create } from 'zustand';
import type { Friend } from '@/types';
import { getDatabase, schema } from '@/database';
import { eq } from 'drizzle-orm';
import { generateId, getTodayISO } from '@/utils/date';

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F472B6',
  '#60A5FA', '#34D399', '#FB923C', '#E879F9', '#38BDF8',
];

interface FriendState {
  friends: Friend[];
  isLoading: boolean;

  loadFriends: () => void;
  addFriend: (data: { name: string; phone?: string }) => Friend;
  updateFriend: (id: string, data: Partial<Friend>) => void;
  deleteFriend: (id: string) => void;
  getFriendById: (id: string) => Friend | undefined;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  isLoading: false,

  loadFriends: () => {
    try {
      const db = getDatabase();
      const results = db.select().from(schema.friends).all();
      set({
        friends: results.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          avatarColor: r.avatarColor,
          createdAt: r.createdAt,
        })),
      });
    } catch (e) {
      console.error('Failed to load friends:', e);
    }
  },

  addFriend: (data) => {
    const db = getDatabase();
    const now = getTodayISO();
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const friend: Friend = {
      id: generateId(),
      name: data.name,
      phone: data.phone ?? null,
      avatarColor: randomColor,
      createdAt: now,
    };

    db.insert(schema.friends).values(friend).run();
    set((state) => ({ friends: [...state.friends, friend] }));
    return friend;
  },

  updateFriend: (id, data) => {
    const db = getDatabase();
    db.update(schema.friends)
      .set(data as any)
      .where(eq(schema.friends.id, id))
      .run();

    set((state) => ({
      friends: state.friends.map((f) =>
        f.id === id ? { ...f, ...data } : f
      ),
    }));
  },

  deleteFriend: (id) => {
    const db = getDatabase();
    db.delete(schema.friends).where(eq(schema.friends.id, id)).run();
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== id),
    }));
  },

  getFriendById: (id) => {
    return get().friends.find((f) => f.id === id);
  },
}));
