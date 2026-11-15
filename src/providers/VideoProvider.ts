import type { GenerationRequest, JobState, ProviderCredentials, ProviderId } from '../core/types';

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
  createJob(req: GenerationRequest, creds: ProviderCredentials, signal?: AbortSignal): Promise<string>;
  getJob(jobId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState>;
}
