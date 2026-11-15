import type { GenerationRequest, JobState, ProviderCredentials, ProviderId, VideoQuality } from '../core/types';

export interface CredentialField {
  key: string;
  labelKey: string;
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
}

export interface VideoProvider {
  id: ProviderId;
  credentialFields: CredentialField[];
  supportsImage: boolean;
  /** Allowed clip lengths in seconds for the given quality; the first one is the default. */
  durations(quality: VideoQuality): number[];
  createJob(req: GenerationRequest, creds: ProviderCredentials, signal?: AbortSignal): Promise<string>;
  getJob(jobId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState>;
}
