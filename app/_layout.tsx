import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../src/i18n';
import { useSettings } from '../src/hooks/useSettings';
import { initBackgroundSupport } from '../src/services/backgroundJobs';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  useSettings(); // loads persisted language and applies it to i18n
  const { t } = useT();
  const router = useRouter();
  useEffect(() => initBackgroundSupport(() => router.push('/history')), [router]);
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
