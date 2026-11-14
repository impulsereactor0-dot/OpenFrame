import { AppError, errorFromHttpStatus } from '../../core/errors';
import { httpJson, assertHttps } from '../../core/http';
import type { GenerationMode, GenerationRequest, JobState, ProviderCredentials } from '../../core/types';
import { buildKlingToken } from './auth';
import { errorFromKlingCode, mapKlingStatus } from './mapper';

const BASE = 'https://api.klingai.com/v1/videos';
const MODEL = 'kling-v1-6';

// jobId encodes the mode because the status endpoint differs per mode: "<mode>:<taskId>".
const encodeJobId = (mode: GenerationMode, id: string) => `${mode}:${id}`;
function decodeJobId(jobId: string): { mode: GenerationMode; id: string } {
  const [mode, ...rest] = jobId.split(':');
  if ((mode !== 'text2video' && mode !== 'image2video') || rest.length === 0) throw new AppError('BAD_REQUEST');
  return { mode, id: rest.join(':') };
}

function check(res: { status: number; ok: boolean; data: any }): void {
  const fromBody = errorFromKlingCode(res.data?.code, res.data?.message);
  if (fromBody) throw fromBody;
  if (!res.ok) throw errorFromHttpStatus(res.status);
}

export async function createKlingTask(req: GenerationRequest, creds: ProviderCredentials, signal?: AbortSignal): Promise<string> {
  const headers = { Authorization: `Bearer ${buildKlingToken(creds)}` };
  const body: Record<string, unknown> = {
    model_name: MODEL,
    prompt: req.prompt,
    duration: String(req.durationSec === 10 ? 10 : 5),
    mode: 'std',
  };
  if (req.mode === 'image2video') {
    if (!req.imageBase64) throw new AppError('BAD_REQUEST');
    body.image = req.imageBase64; // raw base64, no data: prefix
  }
  const res = await httpJson(`${BASE}/${req.mode}`, { method: 'POST', headers, body, signal });
  check(res);
  const id = res.data?.data?.task_id;
  if (!id) throw new AppError('SERVER');
  return encodeJobId(req.mode, String(id));
}

export async function queryKlingTask(jobId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState> {
  const { mode, id } = decodeJobId(jobId);
  const headers = { Authorization: `Bearer ${buildKlingToken(creds)}` };
  const res = await httpJson(`${BASE}/${mode}/${encodeURIComponent(id)}`, { headers, signal });
  check(res);
  const data = res.data?.data;
  const status = mapKlingStatus(data?.task_status);
  if (status === 'failed') return { jobId, status, failReason: data?.task_status_msg };
  if (status !== 'succeeded') return { jobId, status };
  const url: string | undefined = data?.task_result?.videos?.[0]?.url;
  if (!url) throw new AppError('SERVER');
  assertHttps(url);
  return { jobId, status, videoUrl: url };
}
