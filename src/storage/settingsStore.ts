import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProviderId } from '../core/types';

export type Language = 'ru' | 'en';

export interface Settings {
  /** null = follow device language */
  language: Language | null;
  lastProvider: ProviderId;
}

export const DEFAULT_SETTINGS: Settings = { language: null, lastProvider: 'minimax' };

const KEY = 'openframe_settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
