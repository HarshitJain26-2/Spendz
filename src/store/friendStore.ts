import { create } from 'zustand';
import type { Friend } from '@/types';
import { repository } from '@/database';
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
      const friends = repository.getFriends();
      set({ friends });
    } catch (e) {
      console.error('Failed to load friends:', e);
    }
  },

  addFriend: (data) => {
    const now = getTodayISO();
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const friend: Friend = {
      id: generateId(),
      name: data.name,
      phone: data.phone ?? null,
      avatarColor: randomColor,
      createdAt: now,
    };

    repository.addFriend(friend);
    set((state) => ({ friends: [...state.friends, friend] }));
    return friend;
  },

  updateFriend: (id, data) => {
    repository.updateFriend(id, data);
    set((state) => ({
      friends: state.friends.map((f) =>
        f.id === id ? { ...f, ...data } : f
      ),
    }));
  },

  deleteFriend: (id) => {
    repository.deleteFriend(id);
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== id),
    }));
  },

  getFriendById: (id) => {
    return get().friends.find((f) => f.id === id);
  },
}));
