import { AppError } from './errors';

export interface PollOptions<T> {
  isDone: (value: T) => boolean;
  onTick?: (value: T) => void;
  signal?: AbortSignal;
  intervalMs?: number;
  maxIntervalMs?: number;
  timeoutMs?: number;
  /** Consecutive transient failures tolerated (network/timeout/server). */
  maxTransientErrors?: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AppError('CANCELLED'));
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AppError('CANCELLED'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const TRANSIENT = new Set(['NO_NETWORK', 'TIMEOUT', 'SERVER']);

/** Calls `fn` repeatedly with gentle backoff until `isDone`, abort or timeout. */
export async function pollUntil<T>(fn: () => Promise<T>, opts: PollOptions<T>): Promise<T> {
  const { isDone, onTick, signal, intervalMs = 4000, maxIntervalMs = 10000, timeoutMs = 15 * 60 * 1000, maxTransientErrors = 30 } = opts;
  const started = Date.now();
  let delay = intervalMs;
  let failures = 0;

  for (;;) {
    if (signal?.aborted) throw new AppError('CANCELLED');
    try {
      const value = await fn();
      failures = 0;
      onTick?.(value);
      if (isDone(value)) return value;
    } catch (e) {
      if (!(e instanceof AppError) || !TRANSIENT.has(e.code) || ++failures > maxTransientErrors) throw e;
    }
    if (Date.now() - started > timeoutMs) throw new AppError('TIMEOUT');
    await sleep(delay, signal);
    delay = Math.min(Math.round(delay * 1.2), maxIntervalMs);
  }
}
