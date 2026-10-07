import React from 'react';
import { Stack } from 'expo-router';

export default function GroupInviteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[code]" />
    </Stack>
  );
}
