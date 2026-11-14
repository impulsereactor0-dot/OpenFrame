import type { VideoProvider } from '../VideoProvider';
import { createVideoTask, queryVideoTask } from './client';

export const minimaxProvider: VideoProvider = {
  id: 'minimax',
  credentialFields: [{ key: 'apiKey', labelKey: 'settings.keyApiKey' }],
  supportsImage: true,
  createJob: createVideoTask,
  getJob: queryVideoTask,
};
