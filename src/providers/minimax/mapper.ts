import { AppError } from '../../core/errors';
import type { JobStatus } from '../../core/types';

/** Maps MiniMax base_resp.status_code to AppError (undefined = success). */
export function errorFromBaseResp(code: number | undefined, msg?: string): AppError | undefined {
  if (code === undefined || code === 0) return undefined;
  switch (code) {
    case 1004: // authentication failed
    case 2049: // invalid api key
      return new AppError('INVALID_KEY', msg);
    case 1008: // insufficient balance
      return new AppError('NO_BALANCE', msg);
    case 1002: // rate limit
    case 1039: // TPM limit
    case 1041: // concurrency limit
    case 2045: // rate growth limit
      return new AppError('RATE_LIMIT', msg);
    case 1026: // input sensitive
    case 1027: // output sensitive
      return new AppError('CONTENT_BLOCKED', msg);
    case 2013: // invalid params
    case 2056:
      return new AppError('BAD_REQUEST', msg);
    case 1000:
    case 1001:
    case 1013:
    case 1021:
      return new AppError('SERVER', msg);
    default:
      return new AppError('UNKNOWN', msg);
  }
}

export function mapStatus(status: string | undefined): JobStatus {
  switch (status?.toLowerCase()) {
    case 'success':
    case 'succeeded':
      return 'succeeded';
    case 'fail':
    case 'failed':
      return 'failed';
    case 'queueing':
    case 'queued':
    case 'preparing':
      return 'queued';
    default:
      return 'processing';
  }
}
