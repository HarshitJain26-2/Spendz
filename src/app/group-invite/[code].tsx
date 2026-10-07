import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { parseInviteCodeFromUrlOrInput } from '@/utils/inviteCode';

export default function GroupInviteDeepLinkScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { colors } = useTheme();

  useEffect(() => {
    const raw = code || '';
    const parsed = parseInviteCodeFromUrlOrInput(raw) || raw;
    router.replace(`/groups/join?code=${encodeURIComponent(parsed)}` as any);
  }, [code, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
