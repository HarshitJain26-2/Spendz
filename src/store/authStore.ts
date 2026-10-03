import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from './appStore';

interface AuthState {
  // Auth state
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  intendedDestination: string | null;

  // Actions
  setIntendedDestination: (path: string | null) => void;
  initAuth: () => Promise<void>;
  signOut: () => Promise<{ error: Error | null }>;
}

let isListenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  isAuthenticated: false,
  intendedDestination: null,

  setIntendedDestination: (path) => set({ intendedDestination: path }),

  initAuth: async () => {
    try {
      set({ isLoading: true });

      // 1. Fetch current persisted session
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[Spendz Auth] Error retrieving session:', error.message);
      }

      const session = data?.session ?? null;
      const user = session?.user ?? null;

      if (user) {
        // Sync profile user id and email with authenticated session
        const currentProfile = useAppStore.getState().userProfile;
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
        useAppStore.getState().setUserProfile({
          id: user.id,
          email: user.email || currentProfile.email || '',
          ...(metaName && !currentProfile.fullName ? { fullName: metaName, name: metaName } : {}),
        });
      }

      set({
        session,
        user,
        isAuthenticated: !!session,
        isInitialized: true,
        isLoading: false,
      });

      // 2. Set up reactive auth state change listener once
      if (!isListenerRegistered) {
        isListenerRegistered = true;
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          const newUser = newSession?.user ?? null;

          if (newUser) {
            const currentProfile = useAppStore.getState().userProfile;
            const metaName = newUser.user_metadata?.full_name || newUser.user_metadata?.name;
            useAppStore.getState().setUserProfile({
              id: newUser.id,
              email: newUser.email || currentProfile.email || '',
              ...(metaName && !currentProfile.fullName ? { fullName: metaName, name: metaName } : {}),
            });
          }

          set({
            session: newSession,
            user: newUser,
            isAuthenticated: !!newSession,
            isLoading: false,
          });
        });
      }
    } catch (e: any) {
      console.warn('[Spendz Auth] Init failed gracefully:', e);
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('[Spendz Auth] Sign out warning:', error.message);
      }
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        intendedDestination: null,
      });
      return { error: error as Error | null };
    } catch (e: any) {
      console.error('[Spendz Auth] Sign out error:', e);
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        intendedDestination: null,
      });
      return { error: e as Error };
    }
  },
}));
