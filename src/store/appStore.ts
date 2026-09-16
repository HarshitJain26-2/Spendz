import { create } from 'zustand';
import type { ThemeMode, UserProfile } from '@/types';

interface AppState {
  // Onboarding
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => void;

  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // User
  userProfile: UserProfile;
  setUserProfile: (profile: Partial<UserProfile>) => void;

  // DB ready
  isDbReady: boolean;
  setIsDbReady: (ready: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasOnboarded: false,
  setHasOnboarded: (value) => set({ hasOnboarded: value }),

  themeMode: 'system',
  setThemeMode: (mode) => set({ themeMode: mode }),

  userProfile: {
    name: '',
    currency: '₹',
  },
  setUserProfile: (profile) =>
    set((state) => ({
      userProfile: { ...state.userProfile, ...profile },
    })),

  isDbReady: false,
  setIsDbReady: (ready) => set({ isDbReady: ready }),
}));
