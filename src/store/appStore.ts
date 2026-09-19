import { create } from 'zustand';
import type { ThemeMode, UserProfile } from '@/types';
import { repository } from '@/database';

interface AppState {
  // Hydration & DB
  isHydrated: boolean;
  setIsHydrated: (hydrated: boolean) => void;
  isDbReady: boolean;
  setIsDbReady: (ready: boolean) => void;

  // Onboarding
  hasOnboarded: boolean;
  setHasOnboarded: (value: boolean) => void;

  // Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // User
  userProfile: UserProfile;
  setUserProfile: (profile: Partial<UserProfile>) => void;

  // Load from DB
  loadSettings: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isHydrated: false,
  setIsHydrated: (ready) => set({ isHydrated: ready }),

  isDbReady: false,
  setIsDbReady: (ready) => set({ isDbReady: ready }),

  hasOnboarded: false,
  setHasOnboarded: (value) => {
    try {
      repository.saveAppSettings({ hasOnboarded: value });
    } catch (e) {
      console.warn('Failed to save hasOnboarded:', e);
    }
    set({ hasOnboarded: value });
  },

  themeMode: 'light',
  setThemeMode: (mode) => {
    try {
      repository.saveAppSettings({ themeMode: mode });
    } catch (e) {
      console.warn('Failed to save themeMode:', e);
    }
    set({ themeMode: mode });
  },

  userProfile: {
    name: '',
    currency: '₹',
  },
  setUserProfile: (profile) => {
    const updated = { ...get().userProfile, ...profile };
    try {
      repository.saveAppSettings({ userProfile: updated });
    } catch (e) {
      console.warn('Failed to save userProfile:', e);
    }
    set({ userProfile: updated });
  },

  loadSettings: () => {
    try {
      const settings = repository.getAppSettings();
      let hasOnboarded = settings.hasOnboarded;

      // Legacy fallback: if hasOnboarded is false, check if accounts exist
      if (!hasOnboarded) {
        const accounts = repository.getAccounts();
        if (accounts.length > 0) {
          hasOnboarded = true;
          repository.saveAppSettings({ hasOnboarded: true });
        }
      }

      set({
        hasOnboarded,
        themeMode: settings.themeMode || 'light',
        userProfile: settings.userProfile || { name: '', currency: '₹' },
      });
    } catch (e) {
      console.error('Failed to load app settings:', e);
    }
  },
}));
