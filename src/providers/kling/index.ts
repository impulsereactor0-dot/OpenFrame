import type { VideoProvider } from '../VideoProvider';
import { createKlingTask, queryKlingTask } from './client';

export const klingProvider: VideoProvider = {
  id: 'kling',
  credentialFields: [
    { key: 'accessKey', labelKey: 'settings.keyAccessKey' },
    { key: 'secretKey', labelKey: 'settings.keySecretKey' },
  ],
  supportsImage: true,
  createJob: createKlingTask,
  getJob: queryKlingTask,
};
