import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { GenerationMode, ProviderId } from '../src/core/types';
import { getErrorMessage } from '../src/core/errorMessages';
import { useGeneration } from '../src/hooks/useGeneration';
import { useAsyncAction } from '../src/hooks/useAsyncAction';
import { useSettings } from '../src/hooks/useSettings';
import { PROVIDERS, getProvider } from '../src/providers/registry';
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
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ uri: string; base64: string; mime: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const working = busy || gen.isRunning;
  const supportsImage = getProvider(provider).supportsImage;
  const effectiveMode: GenerationMode = supportsImage ? mode : 'text2video';

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
    if (!prompt.trim()) return setLocalError(t('generate.emptyPrompt'));
    if (effectiveMode === 'image2video' && !image) return setLocalError(t('generate.noImage'));
    void run({
      provider,
      mode: effectiveMode,
      prompt: prompt.trim(),
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
      <PromptInput
        label={t('generate.prompt')}
        placeholder={t('generate.promptPlaceholder')}
        value={prompt}
        onChangeText={setPrompt}
        editable={!working}
      />
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
      {!working && videoUri ? <VideoCard uri={videoUri} /> : null}
    </Screen>
  );
}
