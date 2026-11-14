export type ProviderId = 'minimax' | 'kling';
export type GenerationMode = 'text2video' | 'image2video';

export interface GenerationRequest {
  provider: ProviderId;
  mode: GenerationMode;
  prompt: string;
  imageBase64?: string;
  imageMime?: string;
  durationSec?: 5 | 10;
}

export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface JobState {
  jobId: string;
  status: JobStatus;
  videoUrl?: string;
  failReason?: string;
}

/** minimax: {apiKey}; kling: {accessKey, secretKey} */
export type ProviderCredentials = Record<string, string>;

export interface HistoryItem {
  id: string;
  provider: ProviderId;
  mode: GenerationMode;
  prompt: string;
  createdAt: number;
  status: JobStatus;
  videoUrl?: string;
  localUri?: string;
}
