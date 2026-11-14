import { useCallback, useRef, useState } from 'react';
import { AppError, toAppError } from '../core/errors';

/** Wraps an async action: ignores calls while running; `run` never throws. */
export function useAsyncAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const lock = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (e) {
      setError(toAppError(e));
      return undefined;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  return { run, busy, error, clearError };
}
