import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getLocales } from 'expo-localization';
import { getLanguage, setLanguage as applyLanguage, type Language } from '../i18n';
import type { ProviderId } from '../core/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../storage/settingsStore';

// Shared store so every screen sees the same provider/language.
let providerState: ProviderId = DEFAULT_SETTINGS.lastProvider;
let loadStarted = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

function deviceLanguage(): Language {
  return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en';
}

async function initOnce() {
  if (loadStarted) return;
  loadStarted = true;
  const s = await loadSettings();
  applyLanguage(s.language ?? deviceLanguage());
  providerState = s.lastProvider;
  emit();
}

export function useSettings() {
  useEffect(() => {
    void initOnce();
  }, []);
  const provider = useSyncExternalStore(subscribe, () => providerState, () => providerState);
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);

  const setLanguage = useCallback((l: Language) => {
    applyLanguage(l);
    emit();
    void saveSettings({ language: l });
  }, []);

  const setProvider = useCallback((p: ProviderId) => {
    providerState = p;
    emit();
    void saveSettings({ lastProvider: p });
  }, []);

  return { language, setLanguage, provider, setProvider };
}
