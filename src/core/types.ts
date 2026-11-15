export type ProviderId = 'minimax' | 'kling' | 'custom';
export type GenerationMode = 'text2video' | 'image2video';
export type VideoQuality = 'standard' | 'high';

export interface GenerationRequest {
  provider: ProviderId;
  mode: GenerationMode;
  prompt: string;
  imageBase64?: string;
  imageMime?: string;
  durationSec?: number;
  quality?: VideoQuality;
}

export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface JobState {
  jobId: string;
  status: JobStatus;
  videoUrl?: string;
  failReason?: string;
}

/** minimax: {apiKey, baseUrl?}; kling: {accessKey, secretKey, baseUrl?}; custom: {baseUrl, apiKey, model?} */
export type ProviderCredentials = Record<string, string>;

export interface HistoryItem {
  id: string;
  jobId?: string;
  provider: ProviderId;
  mode: GenerationMode;
  prompt: string;
  createdAt: number;
  status: JobStatus;
  videoUrl?: string;
  localUri?: string;
}
