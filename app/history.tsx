import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getErrorMessage } from '../src/core/errorMessages';
import type { HistoryItem } from '../src/core/types';
import { getHistory, removeHistoryItem } from '../src/storage/historyStore';
import { resumeGeneration } from '../src/services/generationService';
import { saveVideoToDevice, shareVideo } from '../src/services/videoFiles';
import { useT } from '../src/i18n';
import { Screen } from '../src/ui/components/Screen';
import { VideoCard } from '../src/ui/components/VideoCard';
import { ErrorBanner } from '../src/ui/components/ErrorBanner';
import { theme } from '../src/ui/theme';

export default function HistoryScreen() {
  const { t } = useT();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkController = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      checkController.current?.abort();
    };
  }, []);

  const load = useCallback(() => {
    getHistory().then(setItems).catch(() => setItems([]));
  }, []);
  useFocusEffect(load);

  const checkStatus = async (item: HistoryItem) => {
    if (checkingId) return;
    setError(null);
    setCheckingId(item.id);
    const ctrl = new AbortController();
    checkController.current = ctrl;
    try {
      await resumeGeneration(item, { signal: ctrl.signal });
      if (mounted.current) load();
    } catch (e) {
      if (mounted.current) {
        setError(getErrorMessage(e));
        load();
      }
    } finally {
      checkController.current = null;
      if (mounted.current) setCheckingId(null);
    }
  };

  const confirmDelete = (id: string) =>
    Alert.alert(t('history.confirmDelete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await removeHistoryItem(id);
          if (playing === id) setPlaying(null);
          load();
        },
      },
    ]);

  const share = async (item: HistoryItem) => {
    setError(null);
    try {
      await shareVideo(item);
    } catch {
      setError(t('history.shareError'));
    }
  };

  const download = async (item: HistoryItem) => {
    if (savingId) return;
    setError(null);
    setSavedId(null);
    setSavingId(item.id);
    try {
      const ok = await saveVideoToDevice(item);
      if (ok && mounted.current) {
        setSavedId(item.id);
        load();
      }
    } catch {
      if (mounted.current) setError(t('generate.downloadError'));
    } finally {
      if (mounted.current) setSavingId(null);
    }
  };

  const statusLabel = (i: HistoryItem) =>
    i.status === 'failed' ? t('history.failed') : i.status === 'succeeded' ? '' : t('history.inProgress');

  return (
    <Screen title={t('history.title')}>
      <ErrorBanner message={error} />
      {items.length === 0 ? <Text style={styles.empty}>{t('history.empty')}</Text> : null}
      {items.map((item) => {
        const uri = item.localUri ?? item.videoUrl;
        return (
          <View key={item.id} style={styles.card}>
            <Text style={styles.prompt} numberOfLines={2}>{item.prompt}</Text>
            <Text style={styles.meta}>
              {t(`settings.${item.provider}`)} · {new Date(item.createdAt).toLocaleString()} {statusLabel(item)}
            </Text>
            {playing === item.id && uri ? <VideoCard uri={uri} /> : null}
            {savedId === item.id ? <Text style={styles.saved}>{t('generate.videoSaved')}</Text> : null}
            <View style={styles.row}>
              {uri ? (
                <>
                  <Action label={t('common.play')} onPress={() => setPlaying(playing === item.id ? null : item.id)} />
                  <Action
                    label={savingId === item.id ? t('common.downloading') : t('common.download')}
                    disabled={savingId !== null}
                    onPress={() => void download(item)}
                  />
                  <Action label={t('common.share')} onPress={() => share(item)} />
                </>
              ) : item.jobId ? (
                <Action
                  label={checkingId === item.id ? t('history.checking') : t('history.checkStatus')}
                  disabled={checkingId !== null}
                  onPress={() => void checkStatus(item)}
                />
              ) : (
                <Text style={styles.meta}>{t('history.noVideo')}</Text>
              )}
              <Action label={t('common.delete')} danger onPress={() => confirmDelete(item.id)} />
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

function Action({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.action, disabled && { opacity: 0.5 }]}>
      <Text style={[styles.actionText, danger && { color: theme.colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.colors.muted, textAlign: 'center', marginTop: theme.spacing.lg },
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  prompt: { color: theme.colors.text, fontSize: theme.font.body },
  meta: { color: theme.colors.muted, fontSize: theme.font.small },
  saved: { color: theme.colors.success, fontSize: theme.font.small, fontWeight: '600' },
  row: { flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' },
  action: { paddingVertical: 6, paddingRight: theme.spacing.sm },
  actionText: { color: theme.colors.primary, fontSize: theme.font.body, fontWeight: '600' },
});
