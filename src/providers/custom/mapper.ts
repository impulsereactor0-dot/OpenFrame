import { AppError, errorFromHttpStatus } from '../../core/errors';
import type { JobStatus } from '../../core/types';
import { errorFromKlingCode } from '../kling/mapper';
import { errorFromBaseResp } from '../minimax/mapper';

function firstStr(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function firstId(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function classifyErrorText(text: string): AppError {
  if (/auth|key|unauthoriz|forbidden|token|401|403/i.test(text)) return new AppError('INVALID_KEY', text);
  if (/balance|quota|billing|credit|insufficient|payment|fund|402/i.test(text)) return new AppError('NO_BALANCE', text);
  if (/rate|limit|too many|throttl|429/i.test(text)) return new AppError('RATE_LIMIT', text);
  if (/content|moderat|safety|policy|nsfw|block|sensitiv/i.test(text)) return new AppError('CONTENT_BLOCKED', text);
  return new AppError('BAD_REQUEST', text);
}

/** Checks MiniMax `base_resp`, Kling `code`, and standard `{ error }` payloads. */
export function errorFromCustomBody(data: any): AppError | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const mm = errorFromBaseResp(data.base_resp?.status_code, data.base_resp?.status_msg);
  if (mm) return mm;

  if (typeof data.code === 'number' && data.code !== 0 && !(data.code >= 200 && data.code < 300)) {
    if (data.code >= 400 && data.code < 600) return errorFromHttpStatus(data.code);
    if (data.code >= 1000) return errorFromKlingCode(data.code, data.message);
    return classifyErrorText(firstStr(data.message, data.msg, String(data.code)) ?? '');
  }

  const err = data.error;
  if (typeof err === 'string' && err.trim()) return classifyErrorText(err.trim());
  if (err && typeof err === 'object' && Object.keys(err).length > 0) {
    const text = [err.code, err.type, err.message, err.detail].filter((x) => x !== undefined && x !== null).join(' ');
    return classifyErrorText(text || 'error');
  }
  if (err === true) return new AppError('BAD_REQUEST');

  return undefined;
}

function extractFromOutput(val: unknown): string | undefined {
  if (typeof val === 'string') return firstStr(val);
  if (Array.isArray(val)) {
    const first = val[0];
    return typeof first === 'string' ? firstStr(first) : firstStr(first?.video_url, first?.videoUrl, first?.url);
  }
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    return firstStr(obj.video_url, obj.videoUrl, obj.url);
  }
  return undefined;
}

export function extractVideoUrl(data: any): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const output = data.output;
  const result = data.result;
  const inner = data.data;
  return firstStr(
    data.video_url,
    data.videoUrl,
    data.media_url,
    data.mediaUrl,
    data.url,
    extractFromOutput(output),
    extractFromOutput(result),
    inner?.video_url,
    inner?.videoUrl,
    inner?.media_url,
    inner?.mediaUrl,
    inner?.url,
    inner?.task_result?.videos?.[0]?.url,
    data.task_result?.videos?.[0]?.url,
    data.videos?.[0]?.url,
    Array.isArray(inner) ? inner[0]?.url : undefined,
    data.file?.download_url,
  );
}

export function extractTaskId(data: any): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const inner = data.data;
  return firstId(
    data.task_id,
    data.taskId,
    data.request_id,
    data.requestId,
    data.media_id,
    data.mediaId,
    data.operation_id,
    data.operationId,
    data.job_id,
    data.jobId,
    data.id,
    inner?.task_id,
    inner?.taskId,
    inner?.request_id,
    inner?.requestId,
    inner?.media_id,
    inner?.mediaId,
    inner?.operation_id,
    inner?.operationId,
    inner?.job_id,
    inner?.jobId,
    inner?.id,
  );
}

export function extractStatusUrl(data: any): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  return firstStr(
    data.status_url,
    data.statusUrl,
    data.poll_url,
    data.pollUrl,
    data.urls?.get,
    data.data?.status_url,
    data.data?.statusUrl,
  );
}

export function mapCustomStatus(rawStatus: unknown, hasVideoUrl = false): JobStatus {
  const s = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
  switch (s) {
    case 'success':
    case 'succeeded':
    case 'succeed':
    case 'completed':
    case 'complete':
    case 'done':
    case 'finished':
      return 'succeeded';
    case 'fail':
    case 'failed':
    case 'error':
    case 'cancelled':
    case 'canceled':
    case 'rejected':
      return 'failed';
    case 'queued':
    case 'queueing':
    case 'pending':
    case 'submitted':
    case 'waiting':
    case 'created':
    case 'starting':
    case 'preparing':
      return 'queued';
    default:
      return hasVideoUrl ? 'succeeded' : 'processing';
  }
}
