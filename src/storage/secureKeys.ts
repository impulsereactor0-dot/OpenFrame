import * as SecureStore from 'expo-secure-store';
import type { ProviderCredentials, ProviderId } from '../core/types';

const storageKey = (id: ProviderId) => `openframe_creds_${id}`;

export async function saveCredentials(id: ProviderId, creds: ProviderCredentials): Promise<void> {
  const clean: ProviderCredentials = {};
  for (const [k, v] of Object.entries(creds)) clean[k] = v.trim();
  await SecureStore.setItemAsync(storageKey(id), JSON.stringify(clean));
}

export async function getCredentials(id: ProviderId): Promise<ProviderCredentials> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey(id));
    return raw ? (JSON.parse(raw) as ProviderCredentials) : {};
  } catch {
    return {};
  }
}

export async function clearCredentials(id: ProviderId): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(id));
}
