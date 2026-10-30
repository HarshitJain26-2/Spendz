import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const router = useRouter();
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded);
  const accounts = useAccountStore((s) => s.accounts);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Canonical onboarding check with legacy-data fallback
  const isCompleted = hasOnboarded || accounts.length > 0;

  useEffect(() => {
    // If legacy accounts exist but canonical flag was missing, persist it now
    if (!hasOnboarded && accounts.length > 0) {
      setHasOnboarded(true);
    }
  }, [hasOnboarded, accounts.length, setHasOnboarded]);

  useEffect(() => {
    if (!isInitialized || isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/auth/sign-in');
      } else if (isCompleted) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isInitialized, isLoading, isAuthenticated, isCompleted, router]);

  return null;
}

