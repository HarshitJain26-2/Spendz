import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';

export default function Index() {
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded);
  const accounts = useAccountStore((s) => s.accounts);

  // Canonical onboarding check with legacy-data fallback
  const isCompleted = hasOnboarded || accounts.length > 0;

  useEffect(() => {
    // If legacy accounts exist but canonical flag was missing, persist it now
    if (!hasOnboarded && accounts.length > 0) {
      setHasOnboarded(true);
    }
  }, [hasOnboarded, accounts.length, setHasOnboarded]);

  if (isCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}

