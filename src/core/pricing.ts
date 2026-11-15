import type { ProviderId, VideoQuality } from './types';
import { normalizePolzaModel } from '../providers/custom/client';

export interface CostEstimate {
  rubText: string;
  usdText?: string;
  modelLabel: string;
}

/**
 * Returns an approximate cost estimate for a single video generation based on
 * public provider / aggregator per-second rates.
 */
export function estimateVideoCost(params: {
  provider: ProviderId;
  quality: VideoQuality;
  durationSec: number;
  customModel?: string;
}): CostEstimate {
  const { provider, quality, durationSec, customModel } = params;
  const sec = durationSec > 0 ? durationSec : 5;

  if (provider === 'minimax') {
    const usd = quality === 'high' ? 0.49 : sec >= 10 ? 0.56 : 0.28;
    const rub = Math.round(usd * 96);
    return {
      rubText: `~${rub} ₽`,
      usdText: `~$${usd.toFixed(2)}`,
      modelLabel: `MiniMax-Hailuo-02 · ${quality === 'high' ? '1080P' : '768P'}`,
    };
  }

  if (provider === 'kling') {
    const perSecUsd = quality === 'high' ? 0.098 : 0.028;
    const usd = perSecUsd * sec;
    const rub = Math.round(usd * 96);
    return {
      rubText: `~${rub} ₽`,
      usdText: `~$${usd.toFixed(2)}`,
      modelLabel: `kling-v1-6 · ${quality === 'high' ? 'pro' : 'std'}`,
    };
  }

  const resolved = normalizePolzaModel(customModel);
  const lower = resolved.toLowerCase();

  if (lower.includes('seedance-2-mini')) {
    const perSecRub = quality === 'high' ? 4 : 2;
    return {
      rubText: `~${perSecRub * sec} ₽`,
      modelLabel: `${resolved} · ${quality === 'high' ? '720p' : '480p'}`,
    };
  }

  if (lower.includes('seedance-2-fast')) {
    const perSecRub = quality === 'high' ? 6 : 3;
    return {
      rubText: `~${perSecRub * sec} ₽`,
      modelLabel: `${resolved} · ${quality === 'high' ? '720p' : '480p'}`,
    };
  }

  if (lower.includes('seedance')) {
    const perSecRub = quality === 'high' ? 9 : 5;
    return {
      rubText: `~${perSecRub * sec} ₽`,
      modelLabel: `${resolved} · ${quality === 'high' ? '720p' : '480p'}`,
    };
  }

  if (lower.includes('kling')) {
    const perSecRub = quality === 'high' ? 11 : 8;
    return {
      rubText: `~${perSecRub * sec} ₽`,
      modelLabel: `${resolved} · ${quality === 'high' ? 'pro' : 'std'}`,
    };
  }

  if (lower.includes('veo3_fast') || lower.includes('veo-3-fast')) {
    return {
      rubText: `~${12 * sec} ₽`,
      modelLabel: resolved,
    };
  }

  if (lower.includes('veo')) {
    return {
      rubText: `~${25 * sec} ₽`,
      modelLabel: resolved,
    };
  }

  const minRub = (quality === 'high' ? 6 : 2) * sec;
  const maxRub = (quality === 'high' ? 12 : 8) * sec;
  return {
    rubText: `~${minRub}–${maxRub} ₽`,
    modelLabel: resolved,
  };
}
