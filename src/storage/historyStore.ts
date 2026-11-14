import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryItem } from '../core/types';

const KEY = 'openframe_history';
const MAX_ITEMS = 100;

const isItem = (i: unknown): i is HistoryItem =>
  !!i && typeof i === 'object' && typeof (i as HistoryItem).id === 'string';

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter(isItem) : [];
  } catch {
    return [];
  }
}

async function write(list: HistoryItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
}

// Serializes read-modify-write cycles so concurrent updates cannot lose data.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

export function addHistoryItem(item: HistoryItem): Promise<void> {
  return exclusive(async () => {
    const list = await getHistory();
    await write([item, ...list.filter((i) => i.id !== item.id)]);
  });
}

export function updateHistoryItem(id: string, patch: Partial<HistoryItem>): Promise<void> {
  return exclusive(async () => {
    const list = await getHistory();
    await write(list.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  });
}

export function removeHistoryItem(id: string): Promise<void> {
  return exclusive(async () => {
    const list = await getHistory();
    await write(list.filter((i) => i.id !== id));
  });
}

export function clearHistory(): Promise<void> {
  return exclusive(() => AsyncStorage.removeItem(KEY));
}
