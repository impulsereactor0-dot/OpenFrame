import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppError } from '../core/errors';
import { assertHttps } from '../core/http';
import type { HistoryItem } from '../core/types';
import { updateHistoryItem } from '../storage/historyStore';

const DIR = `${FileSystem.documentDirectory}videos/`;

/** Downloads a (HTTPS) video into app-private storage; returns local file URI. */
export async function downloadVideo(url: string, id: string): Promise<string> {
  assertHttps(url);
  try {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    const target = `${DIR}${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
    const res = await FileSystem.downloadAsync(url, target);
    if (res.status < 200 || res.status >= 300) {
      await FileSystem.deleteAsync(target, { idempotent: true });
      throw new AppError('SERVER');
    }
    return res.uri;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('NO_NETWORK');
  }
}

async function ensureLocalVideo(item: HistoryItem): Promise<string> {
  let uri = item.localUri;
  if (uri) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) return uri;
  }
  if (!item.videoUrl) throw new AppError('BAD_REQUEST');
  uri = await downloadVideo(item.videoUrl, item.id);
  await updateHistoryItem(item.id, { localUri: uri });
  return uri;
}

/**
 * Downloads the video (if needed) and saves it to a user-chosen device folder
 * via Android StorageAccessFramework (e.g. Downloads). Returns false if the
 * user cancelled the folder picker.
 */
export async function saveVideoToDevice(item: HistoryItem): Promise<boolean> {
  const localUri = await ensureLocalVideo(item);
  if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
    const initial = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
    const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initial);
    if (!perm.granted) return false;
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const fileName = `openframe_${item.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      perm.directoryUri,
      fileName,
      'video/mp4',
    );
    await FileSystem.writeAsStringAsync(destUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return true;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType: 'video/mp4' });
    return true;
  }
  throw new AppError('UNKNOWN');
}

/** Shares the video; downloads it first if only the remote URL is known. */
export async function shareVideo(item: HistoryItem): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new AppError('UNKNOWN');
  const uri = await ensureLocalVideo(item);
  await Sharing.shareAsync(uri, { mimeType: 'video/mp4' });
}

export async function deleteLocalVideo(localUri?: string): Promise<void> {
  if (localUri) await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
}
