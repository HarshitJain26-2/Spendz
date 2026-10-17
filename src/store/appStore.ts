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
  resetUserProfile: () => void;

  // Load from DB
  loadSettings: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_spendz',
  name: '',
  fullName: '',
  email: '',
  phone: '',
  avatarUri: null,
  currency: '₹',
  createdAt: '',
  updatedAt: '',
};

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

  userProfile: { ...DEFAULT_PROFILE },
  setUserProfile: (profile) => {
    const prev = get().userProfile;
    const now = new Date().toISOString();

    // If switching to a different user, start from clean base rather than inheriting previous user's profile
    const isSwitchingUser = !!profile.id && !!prev.id && profile.id !== prev.id && prev.id !== 'user_spendz';
    const base = isSwitchingUser
      ? {
          ...DEFAULT_PROFILE,
          id: profile.id,
          currency: prev.currency || '₹',
          createdAt: now,
          updatedAt: now,
        }
      : prev;

    const resolvedName =
      profile.fullName !== undefined
        ? profile.fullName
        : profile.name !== undefined
        ? profile.name
        : base.name;

    const updated: UserProfile = {
      ...base,
      ...profile,
      name: resolvedName,
      fullName: resolvedName,
      createdAt: base.createdAt || now,
      updatedAt: now,
    };
    try {
      repository.saveAppSettings({ userProfile: updated });
    } catch (e) {
      console.warn('Failed to save userProfile:', e);
    }
    set({ userProfile: updated });
  },

  resetUserProfile: () => {
    try {
      repository.clearUserProfileSettings();
    } catch (e) {
      console.warn('Failed to clear userProfile settings:', e);
    }
    set({ userProfile: { ...DEFAULT_PROFILE } });
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

      const now = new Date().toISOString();
      const loadedProfile = settings.userProfile || { name: '', currency: '₹' };
      const resolvedName = loadedProfile.fullName || loadedProfile.name || '';
      const finalProfile: UserProfile = {
        id: loadedProfile.id || 'user_spendz',
        name: resolvedName,
        fullName: resolvedName,
        email: loadedProfile.email || '',
        phone: loadedProfile.phone || '',
        avatarUri: loadedProfile.avatarUri || null,
        currency: loadedProfile.currency || '₹',
        createdAt: loadedProfile.createdAt || now,
        updatedAt: loadedProfile.updatedAt || now,
      };

      set({
        hasOnboarded,
        themeMode: settings.themeMode || 'light',
        userProfile: finalProfile,
      });
    } catch (e) {
      console.error('Failed to load app settings:', e);
    }
  },
}));
