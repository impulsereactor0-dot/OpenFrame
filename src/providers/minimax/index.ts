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
  createJob: createVideoTask,
  getJob: queryVideoTask,
};
