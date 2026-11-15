import type { VideoProvider } from '../VideoProvider';
import { createKlingTask, queryKlingTask } from './client';

export const klingProvider: VideoProvider = {
  id: 'kling',
  credentialFields: [
    { key: 'accessKey', labelKey: 'settings.keyAccessKey' },
    { key: 'secretKey', labelKey: 'settings.keySecretKey' },
    {
      key: 'baseUrl',
      labelKey: 'settings.keyBaseUrlOptional',
      secret: false,
      required: false,
      placeholder: 'https://api.klingai.com/v1/videos',
    },
  ],
  supportsImage: true,
  createJob: createKlingTask,
  getJob: queryKlingTask,
};
