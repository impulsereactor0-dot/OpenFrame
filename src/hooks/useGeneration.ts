import { useCallback, useEffect, useRef, useState } from 'react';
import { toAppError, type AppError } from '../core/errors';
import type { GenerationRequest, HistoryItem, JobStatus } from '../core/types';
import { runGeneration } from '../services/generationService';

export type GenerationState = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

/** progressKey i18n keys: progress.submitting | progress.queued | progress.processing | progress.downloading */
export function useGeneration() {
  const [state, setState] = useState<GenerationState>('idle');
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progressKey, setProgressKey] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [result, setResult] = useState<HistoryItem | null>(null);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const start = useCallback(async (req: GenerationRequest): Promise<void> => {
    if (running.current) return; // double-tap guard
    running.current = true;
    const ctrl = new AbortController();
    controller.current = ctrl;
    setError(null);
    setResult(null);
    setState('submitting');
    setStatus('queued');
    setProgressKey('progress.submitting');
    try {
      const item = await runGeneration(req, {
        signal: ctrl.signal,
        onPhase: (phase) => {
          if (!mounted.current) return;
          setState(phase === 'submitting' ? 'submitting' : 'polling');
          setStatus(phase === 'queued' || phase === 'submitting' ? 'queued' : 'processing');
          setProgressKey(`progress.${phase}`);
        },
      });
      if (!mounted.current) return;
      setResult(item);
      setStatus('succeeded');
      setState('done');
    } catch (e) {
      if (!mounted.current) return;
      const err = toAppError(e);
      if (err.code === 'CANCELLED') {
        setState('idle');
        setStatus(null);
      } else {
        setError(err);
        setStatus('failed');
        setState('error');
      }
    } finally {
      running.current = false;
      controller.current = null;
      if (mounted.current) setProgressKey(null);
    }
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);

  const isRunning = state === 'submitting' || state === 'polling';
  return { state, isRunning, status, progressKey, error, result, start, cancel };
}
