import { AppState } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getHistory } from '../storage/historyStore';
import { isJobActive, resumeGeneration } from './generationService';
import { initNotifications } from './notifications';

const BG_TASK = 'openframe-bg-video-poll';

/** Resumes polling for any queued/processing items that are not currently active. */
export async function resumePendingJobs(): Promise<boolean> {
  const list = await getHistory();
  const pending = list.filter(
    (i) => (i.status === 'queued' || i.status === 'processing') && Boolean(i.jobId) && !isJobActive(i.id),
  );
  if (pending.length === 0) return false;
  await Promise.allSettled(pending.map((i) => resumeGeneration(i)));
  return true;
}

try {
  if (!TaskManager.isTaskDefined(BG_TASK)) {
    TaskManager.defineTask(BG_TASK, async () => {
      const hadWork = await resumePendingJobs();
      return hadWork
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData;
    });
  }
} catch {
  // TaskManager unavailable in non-native environments
}

export function initBackgroundSupport(onOpenHistory: () => void): () => void {
  void initNotifications();
  void resumePendingJobs();
  void BackgroundFetch.registerTaskAsync(BG_TASK, {
    minimumInterval: 60,
    stopOnTerminate: false,
    startOnBoot: true,
  }).catch(() => undefined);

  const appSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void resumePendingJobs();
  });
  const notifSub = Notifications.addNotificationResponseReceivedListener(() => {
    onOpenHistory();
  });

  return () => {
    appSub.remove();
    notifSub.remove();
  };
}
