# OpenFrame — architecture spec (contract between modules)

Open-source Android app (Expo + React Native + TypeScript, Expo Router) aggregating AI video generation APIs (MiniMax Hailuo, Kling). No own AI; BYO API keys. Modes: text→video, image→video. UI languages: ru + en.

Rules (from guide.md): no monolithic files; buttons disabled while awaiting API + visible loading state; all errors shown as human-readable localized text (no logs/stack traces); API keys encrypted (expo-secure-store) and persisted; HTTPS only; EAS Build instructions in README.

## Layout (project root = this folder)
```
app.json, eas.json, package.json, tsconfig.json, babel.config.js, .gitignore, README.md, LICENSE
app/                      # Expo Router screens (thin, UI only)
  _layout.tsx
  index.tsx               # generate screen
  history.tsx
  settings.tsx            # API keys, language
src/
  core/
    types.ts              # shared types (see below) -- OWNED BY CORE WRITER
    errors.ts             # AppError + error codes
    errorMessages.ts      # AppError -> localized message
    http.ts               # fetch wrapper: timeout, HTTPS-only, maps failures to AppError
    polling.ts            # generic poll-until-done with abort + backoff
  providers/
    VideoProvider.ts      # interface
    registry.ts
    minimax/ (client.ts, mapper.ts, index.ts)
    kling/   (auth.ts [JWT HS256 from access+secret key], client.ts, mapper.ts, index.ts)
  storage/
    secureKeys.ts         # SecureStore wrapper for API keys
    settingsStore.ts      # AsyncStorage: language, last provider
    historyStore.ts       # AsyncStorage: generation history
  services/
    generationService.ts  # orchestrates create -> poll -> result, history save
    videoFiles.ts         # download to app storage / share
  hooks/ useGeneration.ts, useAsyncAction.ts (blocks double taps), useSettings.ts
  i18n/ index.ts, ru.ts, en.ts
  ui/ components/ (PrimaryButton with loading+disabled, ProviderPicker, ImagePickerField, PromptInput, ErrorBanner, ProgressCard, VideoCard), theme.ts
```

## Contracts (src/core/types.ts)
```ts
export type ProviderId = 'minimax' | 'kling';
export type GenerationMode = 'text2video' | 'image2video';
export interface GenerationRequest { provider: ProviderId; mode: GenerationMode; prompt: string; imageBase64?: string; imageMime?: string; durationSec?: 5|10; }
export type JobStatus = 'queued'|'processing'|'succeeded'|'failed';
export interface JobState { jobId: string; status: JobStatus; videoUrl?: string; failReason?: string; }
export type ProviderCredentials = Record<string,string>; // minimax: {apiKey}; kling: {accessKey, secretKey}
export interface HistoryItem { id: string; provider: ProviderId; mode: GenerationMode; prompt: string; createdAt: number; status: JobStatus; videoUrl?: string; localUri?: string; }
```
```ts
export interface VideoProvider {
  id: ProviderId; credentialFields: {key:string; labelKey:string}[]; supportsImage: boolean;
  createJob(req: GenerationRequest, creds: ProviderCredentials, signal?: AbortSignal): Promise<string>;
  getJob(jobId: string, creds: ProviderCredentials, signal?: AbortSignal): Promise<JobState>;
}
```
Error codes: NO_NETWORK, TIMEOUT, INVALID_KEY, NO_BALANCE, RATE_LIMIT, CONTENT_BLOCKED, BAD_REQUEST, SERVER, MISSING_KEY, CANCELLED, UNKNOWN. Messages via i18n keys `errors.<CODE>`.
