export type ErrorCode =
  | 'NO_NETWORK'
  | 'TIMEOUT'
  | 'INVALID_KEY'
  | 'NO_BALANCE'
  | 'RATE_LIMIT'
  | 'CONTENT_BLOCKED'
  | 'BAD_REQUEST'
  | 'SERVER'
  | 'MISSING_KEY'
  | 'CANCELLED'
  | 'UNKNOWN';

/** Application error. `detail` is optional provider text, never shown as a raw log. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly detail?: string;

  constructor(code: ErrorCode, detail?: string) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Normalizes anything thrown into an AppError. */
export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  if (e instanceof Error && e.name === 'AbortError') return new AppError('CANCELLED');
  return new AppError('UNKNOWN');
}

export function errorFromHttpStatus(status: number): AppError {
  if (status === 401 || status === 403) return new AppError('INVALID_KEY');
  if (status === 402) return new AppError('NO_BALANCE');
  if (status === 429) return new AppError('RATE_LIMIT');
  if (status >= 500) return new AppError('SERVER');
  if (status >= 400) return new AppError('BAD_REQUEST');
  return new AppError('UNKNOWN');
}
