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
      placeholder: 'https://api.gen-api.ru/api/v1/networks/kling',
    },
    { key: 'apiKey', labelKey: 'settings.keyApiKey', secret: true, required: true },
    { key: 'model', labelKey: 'settings.keyModel', secret: false, required: false, placeholder: 'model-id' },
  ],
  supportsImage: true,
  createJob: createCustomTask,
  getJob: queryCustomTask,
};
