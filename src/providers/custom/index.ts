import type { VideoProvider } from '../VideoProvider';
import { createCustomTask, queryCustomTask } from './client';

export const customProvider: VideoProvider = {
  id: 'custom',
  credentialFields: [
    {
      key: 'baseUrl',
      labelKey: 'settings.keyBaseUrl',
      secret: false,
      required: true,
      placeholder: 'https://polza.ai/api/v1/media',
    },
    { key: 'apiKey', labelKey: 'settings.keyApiKey', secret: true, required: true },
    { key: 'model', labelKey: 'settings.keyModel', secret: false, required: false, placeholder: 'bytedance/seedance-2-mini' },
  ],
  supportsImage: true,
  durations: () => [5, 10, 15],
  createJob: createCustomTask,
  getJob: queryCustomTask,
};
