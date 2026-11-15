import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { GenerationMode, ProviderId, VideoQuality } from '../src/core/types';
import { getErrorMessage } from '../src/core/errorMessages';
import { estimateVideoCost } from '../src/core/pricing';
import { useGeneration } from '../src/hooks/useGeneration';
import { useAsyncAction } from '../src/hooks/useAsyncAction';
import { useSettings } from '../src/hooks/useSettings';
import { PROVIDERS, getProvider } from '../src/providers/registry';
import { getCredentials } from '../src/storage/secureKeys';
import { saveVideoToDevice, shareVideo } from '../src/services/videoFiles';
import { useT } from '../src/i18n';
import { Screen } from '../src/ui/components/Screen';
import { ProviderPicker } from '../src/ui/components/ProviderPicker';
import { PromptInput } from '../src/ui/components/PromptInput';
import { ImagePickerField } from '../src/ui/components/ImagePickerField';
import { PrimaryButton } from '../src/ui/components/PrimaryButton';
import { ProgressCard } from '../src/ui/components/ProgressCard';
import { ErrorBanner } from '../src/ui/components/ErrorBanner';
import { VideoCard } from '../src/ui/components/VideoCard';
import { theme } from '../src/ui/theme';

export default function GenerateScreen() {
  const { t } = useT();
  const { provider, setProvider } = useSettings();
  const gen = useGeneration();
  const { run, busy } = useAsyncAction(gen.start);

  const [mode, setMode] = useState<GenerationMode>('text2video');
  const [quality, setQuality] = useState<VideoQuality>('standard');
  const [durationSec, setDurationSec] = useState<number>(5);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ uri: string; base64: string; mime: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [customModel, setCustomModel] = useState<string | undefined>(undefined);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCredentials('custom')
        .then((c) => setCustomModel(c?.model))
        .catch(() => setCustomModel(undefined));
    }, []),
  );

  const saveAction = useAsyncAction(async () => {
    if (!gen.result) return;
    setSaveMessage(null);
    setLocalError(null);
    try {
      const ok = await saveVideoToDevice(gen.result);
      if (ok) setSaveMessage(t('generate.videoSaved'));
    } catch {
      setLocalError(t('generate.downloadError'));
    }
  });

  const shareAction = useAsyncAction(async () => {
    if (!gen.result) return;
    setLocalError(null);
    try {
      await shareVideo(gen.result);
    } catch {
      setLocalError(t('history.shareError'));
    }
  });

  const working = busy || gen.isRunning;
  const providerDef = getProvider(provider);
  const supportsImage = providerDef.supportsImage;
  const effectiveMode: GenerationMode = supportsImage ? mode : 'text2video';
  const durations = providerDef.durations(quality);
  const effectiveDuration = durations.includes(durationSec) ? durationSec : durations[0];
  const cost = estimateVideoCost({ provider, quality, durationSec: effectiveDuration, customModel });

  const pickImage = async () => {
    setLocalError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setLocalError(t('generate.galleryDenied'));
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    if (res.canceled) return;
    const a = res.assets[0];
    if (!a?.base64) return setLocalError(t('generate.imageReadError'));
    if (a.base64.length > 9_500_000) return setLocalError(t('generate.imageTooLarge')); // provider limits ~10 MB
    setImage({ uri: a.uri, base64: a.base64, mime: a.mimeType ?? 'image/jpeg' });
  };

  const submit = () => {
    setLocalError(null);
    setSaveMessage(null);
    if (!prompt.trim()) return setLocalError(t('generate.emptyPrompt'));
    if (effectiveMode === 'image2video' && !image) return setLocalError(t('generate.noImage'));
    void run({
      provider,
      mode: effectiveMode,
      prompt: prompt.trim(),
      durationSec: effectiveDuration,
      quality,
      ...(effectiveMode === 'image2video' && image ? { imageBase64: image.base64, imageMime: image.mime } : {}),
    });
  };

  const errorText = localError ?? (gen.error ? getErrorMessage(gen.error) : null);
  const videoUri = gen.result?.localUri ?? gen.result?.videoUrl ?? null;

  return (
    <Screen title={t('generate.title')}>
      <Text style={{ color: theme.colors.muted }}>{t('generate.provider')}</Text>
      <ProviderPicker<ProviderId>
        options={PROVIDERS.map((p) => ({ value: p.id, label: t(`settings.${p.id}`) }))}
        value={provider}
        onChange={setProvider}
        disabled={working}
      />
      {supportsImage ? (
        <ProviderPicker<GenerationMode>
          options={[
            { value: 'text2video', label: t('generate.text2video') },
            { value: 'image2video', label: t('generate.image2video') },
          ]}
          value={effectiveMode}
          onChange={setMode}
          disabled={working}
        />
      ) : null}
      {effectiveMode === 'image2video' ? (
        <ImagePickerField
          uri={image?.uri ?? null}
          pickLabel={t('generate.pickImage')}
          changeLabel={t('generate.changeImage')}
          removeLabel={t('generate.removeImage')}
          onPick={pickImage}
          onRemove={() => setImage(null)}
          disabled={working}
        />
      ) : null}
      <Text style={{ color: theme.colors.muted }}>{t('generate.quality')}</Text>
      <ProviderPicker<VideoQuality>
        options={[
          { value: 'standard', label: t('generate.qualityStandard') },
          { value: 'high', label: t('generate.qualityHigh') },
        ]}
        value={quality}
        onChange={setQuality}
        disabled={working}
      />
      <Text style={{ color: theme.colors.muted }}>{t('generate.duration')}</Text>
      <ProviderPicker<string>
        options={durations.map((d) => ({ value: String(d), label: `${d} ${t('generate.seconds')}` }))}
        value={String(effectiveDuration)}
        onChange={(v) => setDurationSec(Number(v))}
        disabled={working}
      />
      <PromptInput
        label={t('generate.prompt')}
        placeholder={t('generate.promptPlaceholder')}
        value={prompt}
        onChangeText={setPrompt}
        editable={!working}
      />
      <View style={styles.costBox}>
        <Text style={styles.costTitle}>
          {t('generate.estimatedCost')}: <Text style={styles.costPrice}>{cost.rubText}</Text>
          {cost.usdText ? ` (${cost.usdText})` : ''}
        </Text>
        <Text style={styles.costSub}>
          {cost.modelLabel} · {effectiveDuration} {t('generate.seconds')}
        </Text>
      </View>
      <PrimaryButton
        label={working ? t('generate.buttonBusy') : t('generate.button')}
        loading={working}
        onPress={submit}
      />
      {working ? (
        <ProgressCard
          title={gen.progressKey ? t(gen.progressKey) : t('generate.buttonBusy')}
          hint={t('generate.waiting')}
        />
      ) : null}
      {gen.isRunning ? (
        <Pressable
          accessibilityRole="button"
          onPress={gen.cancel}
          style={{ alignItems: 'center', padding: theme.spacing.md }}
        >
          <Text style={{ color: theme.colors.muted, fontWeight: '600' }}>{t('common.cancel')}</Text>
        </Pressable>
      ) : null}
      <ErrorBanner message={errorText} />
      {!working && videoUri ? (
        <View style={styles.resultBox}>
          <VideoCard uri={videoUri} />
          {saveMessage ? <Text style={styles.savedText}>{saveMessage}</Text> : null}
          <PrimaryButton
            label={saveAction.busy ? t('common.downloading') : t('generate.downloadVideo')}
            loading={saveAction.busy}
            disabled={saveAction.busy || shareAction.busy}
            onPress={() => void saveAction.run()}
          />
          <Pressable
            disabled={saveAction.busy || shareAction.busy}
            onPress={() => void shareAction.run()}
            style={styles.shareBtn}
          >
            <Text style={styles.shareText}>{t('common.share')}</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  costBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    gap: 4,
  },
  costTitle: { color: theme.colors.text, fontSize: theme.font.body },
  costPrice: { color: theme.colors.primary, fontWeight: '700' },
  costSub: { color: theme.colors.muted, fontSize: theme.font.small },
  resultBox: { gap: theme.spacing.sm },
  savedText: { color: theme.colors.success, fontWeight: '600', textAlign: 'center' },
  shareBtn: { alignItems: 'center', paddingVertical: theme.spacing.sm },
  shareText: { color: theme.colors.primary, fontSize: theme.font.body, fontWeight: '600' },
});
