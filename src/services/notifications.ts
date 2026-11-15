import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { t } from '../i18n';

const CHANNEL_ID = 'openframe-video';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Video generation',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch {
    // Notifications unavailable or denied; generation still works without alerts.
  }
}

async function schedule(
  title: string,
  body: string,
  opts: { sound?: boolean; data?: Record<string, string> } = {},
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: opts.sound ?? true,
        ...(opts.data ? { data: opts.data } : {}),
      },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch {
    return null;
  }
}

export function showGeneratingNotification(prompt: string): Promise<string | null> {
  return schedule(t('notifications.generatingTitle'), prompt.slice(0, 100), { sound: false });
}

export async function dismissNotification(id: string | null): Promise<void> {
  if (id) await Notifications.dismissNotificationAsync(id).catch(() => undefined);
}

export async function notifyVideoReady(prompt: string): Promise<void> {
  await schedule(t('notifications.readyTitle'), prompt.slice(0, 100) || t('notifications.readyBody'), {
    data: { target: 'history' },
  });
}

export async function notifyVideoFailed(prompt: string): Promise<void> {
  await schedule(t('notifications.failedTitle'), prompt.slice(0, 100) || t('notifications.failedBody'), {
    data: { target: 'history' },
  });
}
