import { AppError, errorFromHttpStatus } from '../../core/errors';
import { assertHttps, httpJson, resolveBaseUrl } from '../../core/http';
import type { GenerationRequest, JobState, ProviderCredentials } from '../../core/types';
import { errorFromCustomBody, extractStatusUrl, extractTaskId, extractVideoUrl, mapCustomStatus } from './mapper';

function getBaseUrl(creds: ProviderCredentials): string {
  const raw = creds.baseUrl?.trim();
  if (!raw) throw new AppError('MISSING_KEY');
  return resolveBaseUrl(raw, '');
}

function auth(creds: ProviderCredentials): Record<string, string> {
  const key = creds.apiKey?.trim();
  if (!key) throw new AppError('MISSING_KEY');
  return { Authorization: `Bearer ${key}` };
}

function check(res: { status: number; ok: boolean; data: any }): void {
  const fromBody = errorFromCustomBody(res.data);
  if (fromBody) throw fromBody;
  if (!res.ok) throw errorFromHttpStatus(res.status);
}

function getOrigin(url: string): string {
  const m = url.match(/^(https:\/\/[^/]+)/i);
  if (!m) throw new AppError('INVALID_URL');
  return m[1];
}

function resolvePostUrl(baseUrl: string, model?: string): string {
  if (/^https:\/\/[^/]*gen-api\.ru(\/api(\/v1(\/networks)?)?)?$/i.test(baseUrl) && model) {
    return `${getOrigin(baseUrl)}/api/v1/networks/${encodeURIComponent(model)}`;
  }
  return baseUrl;
}

export async function createCustomTask(
  req: GenerationRequest,
  creds: ProviderCredentials,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = getBaseUrl(creds);
  const headers = auth(creds);
  const model = creds.model?.trim();
  const postUrl = resolvePostUrl(baseUrl, model);

  if (req.mode === 'image2video' && !req.imageBase64) {
    throw new AppError('BAD_REQUEST');
  }
  const dataUrl =
    req.mode === 'image2video' ? `data:${req.imageMime ?? 'image/jpeg'};base64,${req.imageBase64}` : undefined;

  const body: Record<string, unknown> = {
    prompt: req.prompt,
    mode: req.mode,
    duration: req.durationSec === 10 ? 10 : 5,
    ...(model ? { model } : {}),
    ...(dataUrl ? { image: dataUrl, first_frame_image: dataUrl, image_url: dataUrl } : {}),
  };

  const res = await httpJson(postUrl, { method: 'POST', headers, body, signal });
  check(res);

  const statusUrl = extractStatusUrl(res.data);
  if (statusUrl) {
    assertHttps(statusUrl);
    return `url:${statusUrl}`;
  }

  const taskId = extractTaskId(res.data);
  if (taskId) {
    if (res.data?.request_id !== undefined || /gen-api\.ru|\/api\/v1\/networks\//i.test(postUrl)) {
      const pollUrl = `${getOrigin(postUrl)}/api/v1/request/get/${encodeURIComponent(taskId)}`;
      assertHttps(pollUrl);
      return `url:${pollUrl}`;
    }
    return `id:${taskId}`;
  }

  const videoUrl = extractVideoUrl(res.data);
  if (videoUrl) {
    assertHttps(videoUrl);
    return `direct:${videoUrl}`;
  }

  throw new AppError('SERVER');
}

export async function queryCustomTask(
  jobId: string,
  creds: ProviderCredentials,
  signal?: AbortSignal,
): Promise<JobState> {
  if (jobId.startsWith('direct:')) {
    const videoUrl = jobId.slice('direct:'.length);
    assertHttps(videoUrl);
    return { jobId, status: 'succeeded', videoUrl };
  }

  const headers = auth(creds);
  let res;
  if (jobId.startsWith('url:')) {
    const statusUrl = jobId.slice('url:'.length);
    assertHttps(statusUrl);
    res = await httpJson(statusUrl, { headers, signal });
  } else if (jobId.startsWith('id:')) {
    const taskId = jobId.slice('id:'.length);
    const baseUrl = getBaseUrl(creds);
    res = await httpJson(`${baseUrl}/${encodeURIComponent(taskId)}`, { headers, signal });
    if (res.status === 404) {
      res = await httpJson(`${baseUrl}?task_id=${encodeURIComponent(taskId)}`, { headers, signal });
    }
  } else {
    throw new AppError('BAD_REQUEST');
  }

  check(res);

  const videoUrl = extractVideoUrl(res.data);
  const rawStatus =
    res.data?.status ??
    res.data?.task_status ??
    res.data?.state ??
    res.data?.data?.status ??
    res.data?.data?.task_status;
  const status = mapCustomStatus(rawStatus, Boolean(videoUrl));

  if (status === 'failed') return { jobId, status };
  if (status !== 'succeeded') return { jobId, status };
  if (!videoUrl) throw new AppError('SERVER');
  assertHttps(videoUrl);
  return { jobId, status, videoUrl };
}
