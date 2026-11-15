import { AppError } from '../core/errors';
import { assertHttps } from '../core/http';
import { pollUntil } from '../core/polling';
import type { GenerationRequest, HistoryItem, JobState, ProviderCredentials } from '../core/types';
import type { VideoProvider } from '../providers/VideoProvider';
import { getProvider } from '../providers/registry';
import { getCredentials } from '../storage/secureKeys';
import { addHistoryItem, updateHistoryItem } from '../storage/historyStore';
import { dismissNotification, notifyVideoFailed, notifyVideoReady, showGeneratingNotification } from './notifications';
import { downloadVideo } from './videoFiles';

export type GenerationPhase = 'submitting' | 'queued' | 'processing' | 'downloading';

export interface RunOptions {
  signal?: AbortSignal;
  onPhase?: (phase: GenerationPhase) => void;
}

const activeJobs = new Set<string>();

export function isJobActive(id: string): boolean {
  return activeJobs.has(id);
}

async function loadAndValidateCreds(provider: VideoProvider): Promise<ProviderCredentials> {
  const creds = await getCredentials(provider.id);
  const required = provider.credentialFields.filter((f) => f.required !== false);
  if (!required.every((f) => creds[f.key]?.trim())) throw new AppError('MISSING_KEY');
  if (creds.baseUrl?.trim()) assertHttps(creds.baseUrl.trim());
  return creds;
}

async function finishJob(
  item: HistoryItem,
  jobId: string,
  provider: VideoProvider,
  creds: ProviderCredentials,
  opts: RunOptions,
): Promise<HistoryItem> {
  const { signal, onPhase } = opts;
  activeJobs.add(item.id);
  let notifId: string | null = null;
  try {
    notifId = await showGeneratingNotification(item.prompt);
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
    await notifyVideoReady(item.prompt);
    return done;
  } catch (e) {
    const isTransient = e instanceof AppError && (e.code === 'NO_NETWORK' || e.code === 'TIMEOUT' || e.code === 'SERVER');
    const isCancelled = e instanceof AppError && e.code === 'CANCELLED';
    await updateHistoryItem(item.id, { status: isTransient ? 'processing' : 'failed' }).catch(() => undefined);
    if (!isTransient && !isCancelled) {
      await notifyVideoFailed(item.prompt);
    }
    throw e;
  } finally {
    activeJobs.delete(item.id);
    await dismissNotification(notifId);
  }
}

/** create -> poll -> download -> history. Throws AppError. */
export async function runGeneration(req: GenerationRequest, opts: RunOptions = {}): Promise<HistoryItem> {
  const { signal, onPhase } = opts;
  const provider = getProvider(req.provider);
  if (!req.prompt.trim() && req.mode === 'text2video') throw new AppError('BAD_REQUEST');
  if (req.mode === 'image2video' && !provider.supportsImage) throw new AppError('BAD_REQUEST');

  const creds = await loadAndValidateCreds(provider);

  onPhase?.('submitting');
  const jobId = await provider.createJob(req, creds, signal);

  const item: HistoryItem = {
    id: `${req.provider}-${Date.now()}`,
    jobId,
    provider: req.provider,
    mode: req.mode,
    prompt: req.prompt,
    createdAt: Date.now(),
    status: 'queued',
  };
  await addHistoryItem(item);

  return finishJob(item, jobId, provider, creds, opts);
}

/** Resumes polling for a history item whose jobId was already created. */
export async function resumeGeneration(item: HistoryItem, opts: RunOptions = {}): Promise<HistoryItem> {
  if (!item.jobId) throw new AppError('BAD_REQUEST');
  const provider = getProvider(item.provider);
  const creds = await loadAndValidateCreds(provider);
  return finishJob(item, item.jobId, provider, creds, opts);
}
