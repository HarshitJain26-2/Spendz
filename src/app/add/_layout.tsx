import React from 'react';
import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="expense" />
      <Stack.Screen name="income" />
      <Stack.Screen name="transfer" />
      <Stack.Screen name="split" />
    </Stack>
  );
}
