import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { VideoProvider } from '../../providers/VideoProvider';
import { getCredentials, saveCredentials, clearCredentials } from '../../storage/secureKeys';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { getErrorMessage } from '../../core/errorMessages';
import { useT } from '../../i18n';
import { PrimaryButton } from './PrimaryButton';
import { ErrorBanner } from './ErrorBanner';
import { theme } from '../theme';

const KEY_URLS: Record<string, string> = {
  minimax: 'https://www.minimax.io/platform',
  kling: 'https://klingai.com/global/dev',
};

/** Masked key entry for one provider: save / clear / link to get a key. */
export function ProviderKeysForm({ provider }: { provider: VideoProvider }) {
  const { t } = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    getCredentials(provider.id)
      .then((c) => setValues(c ?? {}))
      .catch(() => setValues({}));
  }, [provider.id]);

  const save = useAsyncAction(async () => {
    const clean: Record<string, string> = {};
    for (const f of provider.credentialFields) clean[f.key] = (values[f.key] ?? '').trim();
    await saveCredentials(provider.id, clean);
    setInfo(t('settings.saved'));
  });
  const clear = useAsyncAction(async () => {
    await clearCredentials(provider.id);
    setValues({});
    setInfo(t('settings.cleared'));
  });

  const busy = save.busy || clear.busy;
  const err = save.error ?? clear.error;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t(`settings.${provider.id}`)}</Text>
      {provider.credentialFields.map((f) => (
        <View key={f.key}>
          <Text style={styles.label}>{t(f.labelKey)}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={values[f.key] ?? ''}
            onChangeText={(v) => {
              setInfo(null);
              setValues((s) => ({ ...s, [f.key]: v }));
            }}
            editable={!busy}
            placeholderTextColor={theme.colors.muted}
          />
        </View>
      ))}
      <ErrorBanner message={err ? getErrorMessage(err) : null} />
      {info ? <Text style={styles.info}>{info}</Text> : null}
      <PrimaryButton label={t('common.save')} loading={save.busy} disabled={busy} onPress={() => void save.run()} />
      <View style={styles.row}>
        <Pressable disabled={busy} onPress={() => void clear.run()}>
          <Text style={styles.link}>{t('common.clear')}</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(KEY_URLS[provider.id] ?? 'https://expo.dev')}>
          <Text style={styles.link}>{t('settings.getKeys')} ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { color: theme.colors.text, fontSize: theme.font.body, fontWeight: '700' },
  label: { color: theme.colors.muted, fontSize: theme.font.small, marginBottom: theme.spacing.xs },
  input: {
    padding: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  info: { color: theme.colors.success },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: theme.colors.primary, fontSize: theme.font.body, fontWeight: '600' },
});
