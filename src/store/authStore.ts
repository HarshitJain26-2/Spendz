import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, clearPersistedAuthStorage } from '@/lib/supabase';
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
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<{
    user: User | null;
    session: Session | null;
    error: Error | null;
  }>;
  signOut: () => Promise<{ error: Error | null }>;
  cleanup: () => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;

const syncProfileForUser = (user: User) => {
  const currentProfile = useAppStore.getState().userProfile;
  const existingValidName =
    currentProfile.id === user.id &&
    (currentProfile.fullName && currentProfile.fullName !== 'User'
      ? currentProfile.fullName
      : currentProfile.name && currentProfile.name !== 'User'
      ? currentProfile.name
      : '');

  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    existingValidName ||
    user.email?.split('@')[0] ||
    '';
  const metaPhone = user.user_metadata?.phone || currentProfile.phone || '';
  const metaAvatar = user.user_metadata?.avatar_url || currentProfile.avatarUri || null;

  useAppStore.getState().setUserProfile({
    id: user.id,
    email: user.email || currentProfile.email || '',
    name: metaName,
    fullName: metaName,
    phone: metaPhone,
    avatarUri: metaAvatar,
  });
};

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

      if (user && session) {
        if (__DEV__) {
          console.log('[Spendz Auth] Restored persisted session for user ID:', user.id);
        }
        syncProfileForUser(user);
        set({
          session,
          user,
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
        });
      } else {
        if (__DEV__) {
          console.log('[Spendz Auth] No persisted session found; confirmed signed-out state.');
        }
        set({
          session: null,
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
        });
      }

      // 2. Set up reactive auth state change listener once
      if (!authSubscription) {
        const { data: listenerData } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (__DEV__) {
            console.log('[Spendz Auth] onAuthStateChange event:', event, 'user ID:', newSession?.user?.id ?? 'none');
          }

          if (event === 'SIGNED_OUT' || !newSession?.user) {
            set({
              session: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          const newUser = newSession.user;
          syncProfileForUser(newUser);

          set({
            session: newSession,
            user: newUser,
            isAuthenticated: true,
            isLoading: false,
          });
        });
        authSubscription = listenerData.subscription;
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

  signInWithPassword: async ({ email, password }) => {
    try {
      set({ isLoading: true });

      const trimmedEmail = email.trim();
      if (__DEV__) {
        console.log('[Spendz Auth] Executing signInWithPassword for:', trimmedEmail);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        if (__DEV__) {
          console.warn('[Spendz Auth] signInWithPassword failed:', error.message);
        }
        set({ isLoading: false });
        return { user: null, session: null, error: error as Error };
      }

      const session = data?.session;
      const user = data?.user;

      if (!session || !user) {
        const noSessionErr = new Error('Sign-in did not return an active session.');
        set({ isLoading: false });
        return { user: null, session: null, error: noSessionErr };
      }

      // Security verification: returned user ID must match active session user ID
      if (user.id !== session.user.id) {
        const mismatchErr = new Error('Security verification failed: user ID does not match session user ID.');
        console.error('[Spendz Auth] Critical: returned user ID mismatch with session user ID!');
        set({ isLoading: false });
        return { user: null, session: null, error: mismatchErr };
      }

      if (__DEV__) {
        console.log('[Spendz Auth] Successfully authenticated user ID:', user.id);
      }

      // Invalidate and clear previous profile data if switching accounts
      const prevUser = get().user;
      if (prevUser && prevUser.id !== user.id) {
        useAppStore.getState().resetUserProfile();
      }

      // Update auth store state synchronously
      set({
        session,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Update user profile state for the newly authenticated account
      syncProfileForUser(user);

      return { user, session, error: null };
    } catch (e: any) {
      console.error('[Spendz Auth] Unexpected error in signInWithPassword:', e);
      set({ isLoading: false });
      return { user: null, session: null, error: e as Error };
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });

      const currentUserId = get().user?.id;
      if (__DEV__) {
        console.log('[Spendz Auth] Signing out user ID:', currentUserId ?? 'unknown');
      }

      // 1. Clear profile state in memory and database settings
      useAppStore.getState().resetUserProfile();

      // 3. Perform Supabase sign out
      let signOutError: Error | null = null;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('[Spendz Auth] Global sign out returned error, falling back to local sign out:', error.message);
          signOutError = error as Error;
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch (err: any) {
        console.warn('[Spendz Auth] Exception during global sign out, falling back to local sign out:', err);
        signOutError = err as Error;
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {}
      }

      // 4. Force-purge persisted auth tokens to prevent stale revival
      await clearPersistedAuthStorage();

      // 5. Update auth store state
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        intendedDestination: null,
      });

      return { error: signOutError };
    } catch (e: any) {
      console.error('[Spendz Auth] Error in signOut:', e);
      await clearPersistedAuthStorage();
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

  cleanup: () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
  },
}));
