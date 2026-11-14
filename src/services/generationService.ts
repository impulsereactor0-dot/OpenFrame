import { AppError } from '../core/errors';
import { pollUntil } from '../core/polling';
import type { GenerationRequest, HistoryItem, JobState } from '../core/types';
import { getProvider } from '../providers/registry';
import { getCredentials } from '../storage/secureKeys';
import { addHistoryItem, updateHistoryItem } from '../storage/historyStore';
import { downloadVideo } from './videoFiles';

export type GenerationPhase = 'submitting' | 'queued' | 'processing' | 'downloading';

export interface RunOptions {
  signal?: AbortSignal;
  onPhase?: (phase: GenerationPhase) => void;
}

/** create -> poll -> download -> history. Throws AppError. */
export async function runGeneration(req: GenerationRequest, opts: RunOptions = {}): Promise<HistoryItem> {
  const { signal, onPhase } = opts;
  const provider = getProvider(req.provider);
  if (!req.prompt.trim() && req.mode === 'text2video') throw new AppError('BAD_REQUEST');
  if (req.mode === 'image2video' && !provider.supportsImage) throw new AppError('BAD_REQUEST');

  const creds = await getCredentials(req.provider);
  if (!provider.credentialFields.every((f) => creds[f.key]?.trim())) throw new AppError('MISSING_KEY');

  onPhase?.('submitting');
  const jobId = await provider.createJob(req, creds, signal);

  const item: HistoryItem = {
    id: `${req.provider}-${Date.now()}`,
    provider: req.provider,
    mode: req.mode,
    prompt: req.prompt,
    createdAt: Date.now(),
    status: 'queued',
  };
  await addHistoryItem(item);

  try {
    const final = await pollUntil<JobState>(() => provider.getJob(jobId, creds, signal), {
      signal,
      isDone: (s) => s.status === 'succeeded' || s.status === 'failed',
      onTick: (s) => onPhase?.(s.status === 'queued' ? 'queued' : 'processing'),
    });

    if (final.status === 'failed' || !final.videoUrl) {
      await updateHistoryItem(item.id, { status: 'failed' });
      throw new AppError('UNKNOWN', final.failReason);
    }

    const done: HistoryItem = { ...item, status: 'succeeded', videoUrl: final.videoUrl };
    onPhase?.('downloading');
    try {
      done.localUri = await downloadVideo(final.videoUrl, item.id);
    } catch {
      // Remote URL remains usable for playback; local copy is best-effort.
    }
    await updateHistoryItem(item.id, done);
    return done;
  } catch (e) {
    await updateHistoryItem(item.id, { status: 'failed' }).catch(() => undefined);
    throw e;
  }
}
