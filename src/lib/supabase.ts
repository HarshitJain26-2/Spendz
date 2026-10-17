import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon_key';

/**
 * Checks if Supabase credentials have been properly configured by the developer.
 */
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return (
    !!url &&
    !!key &&
    !url.includes('your-project') &&
    !url.includes('placeholder') &&
    !key.includes('dummy_anon_key')
  );
};

/**
 * Supported storage adapter for Supabase Auth persistence across platforms:
 * - Web: window.localStorage
 * - Native (Android / iOS): expo-secure-store (with fail-safe fallback)
 */
const CustomStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('[Spendz Auth Storage] Error reading key:', key, e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('[Spendz Auth Storage] Error setting key:', key, e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('[Spendz Auth Storage] Error removing key:', key, e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CustomStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Explicitly cleans up any persisted Supabase authentication tokens from storage.
 * Used during sign-out and account switching to prevent stale device sessions.
 */
export const clearPersistedAuthStorage = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.startsWith('sb-') || k.includes('supabase.auth.token'))) {
            keysToRemove.push(k);
          }
        }
        for (const k of keysToRemove) {
          window.localStorage.removeItem(k);
        }
      }
    } else {
      try {
        const urlHost = new URL(supabaseUrl).hostname.split('.')[0];
        const defaultKey = `sb-${urlHost}-auth-token`;
        await SecureStore.deleteItemAsync(defaultKey);
      } catch {}
      try {
        await SecureStore.deleteItemAsync('supabase.auth.token');
      } catch {}
    }
  } catch (e) {
    console.warn('[Spendz Auth Storage] Error clearing persisted auth storage:', e);
  }
};
