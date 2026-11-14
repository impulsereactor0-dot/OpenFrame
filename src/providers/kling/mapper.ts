import { AppError } from '../../core/errors';
import type { JobStatus } from '../../core/types';

/** Maps Kling body `code` (0 = success) to AppError. */
export function errorFromKlingCode(code: number | undefined, msg?: string): AppError | undefined {
  if (code === undefined || code === 0) return undefined;
  switch (code) {
    case 1000:
    case 1001:
    case 1002:
    case 1003:
    case 1004:
    case 1100: // abnormal account status
    case 1204: // not authorized
      return new AppError('INVALID_KEY', msg);
    case 1101: // account in arrears
    case 1102: // resource pack depleted / insufficient balance
      return new AppError('NO_BALANCE', msg);
    case 1302: // request too fast
    case 1303: // concurrency exceeded
      return new AppError('RATE_LIMIT', msg);
    case 1301: // content policy
      return new AppError('CONTENT_BLOCKED', msg);
    case 1200:
    case 1201:
    case 1202:
    case 1203:
      return new AppError('BAD_REQUEST', msg);
    case 5000:
    case 5001:
    case 5002:
      return new AppError('SERVER', msg);
    default:
      return new AppError('UNKNOWN', msg);
  }
}

export function mapKlingStatus(status: string | undefined): JobStatus {
  switch (status) {
    case 'succeed':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'submitted':
      return 'queued';
    default:
      return 'processing';
  }
}
