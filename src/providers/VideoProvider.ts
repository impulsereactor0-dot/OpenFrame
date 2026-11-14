import type { GenerationRequest, JobState, ProviderCredentials } from '../core/types';

export interface CredentialField {
  key: string;
  labelKey: string;
}

export interface VideoProvider {
  id: 'minimax' | 'kling';
  credentialFields: CredentialField[];
  supportsImage: boolean;
  createJob(req: GenerationRequest, creds: ProviderCredentials, signal?: AbortSignal): Promise<string>;
  getJob(jobId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState>;
}
