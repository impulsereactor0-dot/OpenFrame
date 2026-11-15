import { AppError } from './errors';

export interface HttpOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface HttpResult<T = any> {
  status: number;
  ok: boolean;
  data: T;
}

export function assertHttps(url: string): void {
  if (!/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url.trim())) {
    throw new AppError('INVALID_URL', 'HTTPS required');
  }
}

export function resolveBaseUrl(url: string | undefined, fallback: string): string {
  const custom = url?.trim();
  if (!custom) return fallback;
  assertHttps(custom);
  return custom.replace(/\/+$/, '');
}

/**
 * JSON fetch wrapper. Never throws on HTTP error status (providers report
 * errors in the body); throws AppError on network failure, timeout, cancel,
 * or an unparsable body.
 */
export async function httpJson<T = any>(url: string, opts: HttpOptions = {}): Promise<HttpResult<T>> {
  assertHttps(url);
  const { method = 'GET', headers = {}, body, signal, timeoutMs = 60000 } = opts;
  if (signal?.aborted) throw new AppError('CANCELLED');

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(url, {
      method,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      if (signal?.aborted) throw new AppError('CANCELLED');
      if (timedOut) throw new AppError('TIMEOUT');
      if (res.ok) throw new AppError('SERVER');
    }
    return { status: res.status, ok: res.ok, data };
  } catch (e) {
    if (e instanceof AppError) throw e;
    if (signal?.aborted) throw new AppError('CANCELLED');
    if (timedOut) throw new AppError('TIMEOUT');
    throw new AppError('NO_NETWORK');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
