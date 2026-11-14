import { AppError, errorFromHttpStatus } from '../../core/errors';
import { httpJson, assertHttps } from '../../core/http';
import type { GenerationRequest, JobState, ProviderCredentials } from '../../core/types';
import { errorFromBaseResp, mapStatus } from './mapper';

// Global endpoint. Mainland-China accounts use https://api.minimaxi.com instead.
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
    duration: req.durationSec === 10 ? 10 : 6, // Hailuo-02 supports 6 or 10 s
    resolution: '768P',
  };
  if (req.mode === 'image2video') {
    if (!req.imageBase64) throw new AppError('BAD_REQUEST');
    body.first_frame_image = `data:${req.imageMime ?? 'image/jpeg'};base64,${req.imageBase64}`;
  }
  const res = await httpJson(`${BASE}/video_generation`, { method: 'POST', headers: auth(creds), body, signal });
  check(res);
  const id = res.data?.task_id;
  if (!id) throw new AppError('SERVER');
  return String(id);
}

export async function queryVideoTask(taskId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState> {
  const headers = auth(creds);
  const res = await httpJson(`${BASE}/query/video_generation?task_id=${encodeURIComponent(taskId)}`, { headers, signal });
  check(res);
  const status = mapStatus(res.data?.status);
  if (status === 'failed') return { jobId: taskId, status, failReason: res.data?.base_resp?.status_msg };
  if (status !== 'succeeded') return { jobId: taskId, status };

  const fileId = res.data?.file_id;
  if (!fileId) throw new AppError('SERVER');
  const file = await httpJson(`${BASE}/files/retrieve?file_id=${encodeURIComponent(String(fileId))}`, { headers, signal });
  check(file);
  const url: string | undefined = file.data?.file?.download_url;
  if (!url) throw new AppError('SERVER');
  assertHttps(url);
  return { jobId: taskId, status, videoUrl: url };
}
