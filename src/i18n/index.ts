import { useSyncExternalStore } from 'react';
import { en } from './en';
import { ru } from './ru';

export type Language = 'ru' | 'en';
const dictionaries = { ru, en } as const;

let current: Language = 'ru';
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  if (lang === current) return;
  current = lang;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Translate a dotted key, e.g. t('errors.NO_NETWORK'). Falls back to English, then the key. */
export function t(key: string, lang: Language = current): string {
  const lookup = (dict: unknown): string | undefined => {
    let node: any = dict;
    for (const part of key.split('.')) {
      node = node?.[part];
      if (node === undefined) return undefined;
    }
    return typeof node === 'string' ? node : undefined;
  };
  return lookup(dictionaries[lang]) ?? lookup(en) ?? key;
}

/** React hook: re-renders on language change. */
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return { t: (key: string) => t(key, lang), lang };
}
