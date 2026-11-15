import { AppError, errorFromHttpStatus } from '../../core/errors';
import { httpJson, assertHttps, resolveBaseUrl } from '../../core/http';
import type { GenerationRequest, JobState, ProviderCredentials } from '../../core/types';
import { errorFromBaseResp, mapStatus } from './mapper';

// Global endpoint. Mainland-China accounts use https://api.minimaxi.com/v1 instead.
const BASE = 'https://api.minimax.io/v1';
const MODEL = 'MiniMax-Hailuo-02';

function auth(creds: ProviderCredentials): Record<string, string> {
  const key = creds.apiKey?.trim();
  if (!key) throw new AppError('MISSING_KEY');
  return { Authorization: `Bearer ${key}` };
}

function check(res: { status: number; ok: boolean; data: any }): void {
  const fromBody = errorFromBaseResp(res.data?.base_resp?.status_code, res.data?.base_resp?.status_msg);
  if (fromBody) throw fromBody;
  if (!res.ok) throw errorFromHttpStatus(res.status);
}

export async function createVideoTask(req: GenerationRequest, creds: ProviderCredentials, signal?: AbortSignal): Promise<string> {
  const body: Record<string, unknown> = {
    model: MODEL,
    prompt: req.prompt,
    duration: req.durationSec === 10 && req.quality !== 'high' ? 10 : 6, // 1080P allows 6 s only
    resolution: req.quality === 'high' ? '1080P' : '768P',
  };
  if (req.mode === 'image2video') {
    if (!req.imageBase64) throw new AppError('BAD_REQUEST');
    body.first_frame_image = `data:${req.imageMime ?? 'image/jpeg'};base64,${req.imageBase64}`;
  }
  const base = resolveBaseUrl(creds.baseUrl, BASE);
  const res = await httpJson(`${base}/video_generation`, { method: 'POST', headers: auth(creds), body, signal });
  check(res);
  const id = res.data?.task_id;
  if (!id) throw new AppError('SERVER');
  return String(id);
}

export async function queryVideoTask(taskId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState> {
  const base = resolveBaseUrl(creds.baseUrl, BASE);
  const headers = auth(creds);
  const res = await httpJson(`${base}/query/video_generation?task_id=${encodeURIComponent(taskId)}`, { headers, signal });
  check(res);
  const status = mapStatus(res.data?.status);
  if (status === 'failed') return { jobId: taskId, status, failReason: res.data?.base_resp?.status_msg };
  if (status !== 'succeeded') return { jobId: taskId, status };

  const fileId = res.data?.file_id;
  if (!fileId) throw new AppError('SERVER');
  const file = await httpJson(`${base}/files/retrieve?file_id=${encodeURIComponent(String(fileId))}`, { headers, signal });
  check(file);
  const url: string | undefined = file.data?.file?.download_url;
  if (!url) throw new AppError('SERVER');
  assertHttps(url);
  return { jobId: taskId, status, videoUrl: url };
}
