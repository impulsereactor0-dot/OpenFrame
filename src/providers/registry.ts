import type { ProviderId } from '../core/types';
import type { VideoProvider } from './VideoProvider';
import { minimaxProvider } from './minimax';
import { klingProvider } from './kling';
import { customProvider } from './custom';

export const PROVIDERS: VideoProvider[] = [minimaxProvider, klingProvider, customProvider];

export function getProvider(id: ProviderId): VideoProvider {
  return PROVIDERS.find((p) => p.id === id) ?? minimaxProvider;
}
