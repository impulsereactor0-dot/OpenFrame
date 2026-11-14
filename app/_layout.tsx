import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../src/i18n';
import { useSettings } from '../src/hooks/useSettings';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  useSettings(); // loads persisted language and applies it to i18n
  const { t } = useT();
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
        }}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.generate'), tabBarIcon: icon('videocam') }} />
        <Tabs.Screen name="history" options={{ title: t('tabs.history'), tabBarIcon: icon('time') }} />
        <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('settings') }} />
      </Tabs>
    </>
  );
}
