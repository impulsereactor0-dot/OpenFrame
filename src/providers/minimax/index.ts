import type { VideoProvider } from '../VideoProvider';
import { createVideoTask, queryVideoTask } from './client';

export const minimaxProvider: VideoProvider = {
  id: 'minimax',
  credentialFields: [
    { key: 'apiKey', labelKey: 'settings.keyApiKey' },
    {
      key: 'baseUrl',
      labelKey: 'settings.keyBaseUrlOptional',
      secret: false,
      required: false,
      placeholder: 'https://api.minimax.io/v1',
    },
  ],
  supportsImage: true,
  // Hailuo-02: 768P supports 6 or 10 s, 1080P supports 6 s only.
  durations: (quality) => (quality === 'high' ? [6] : [6, 10]),
  createJob: createVideoTask,
  getJob: queryVideoTask,
};
