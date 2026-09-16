import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';

export default function Index() {
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const accounts = useAccountStore((s) => s.accounts);

  // If user has accounts, they've onboarded (handles app restarts)
  if (accounts.length > 0 || hasOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
