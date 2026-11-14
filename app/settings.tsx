import React from 'react';
import { StyleSheet, Text } from 'react-native';
import type { Language } from '../src/i18n';
import { useT } from '../src/i18n';
import { useSettings } from '../src/hooks/useSettings';
import { PROVIDERS } from '../src/providers/registry';
import { Screen } from '../src/ui/components/Screen';
import { ProviderPicker } from '../src/ui/components/ProviderPicker';
import { ProviderKeysForm } from '../src/ui/components/ProviderKeysForm';
import { theme } from '../src/ui/theme';

export default function SettingsScreen() {
  const { t } = useT();
  const { language, setLanguage } = useSettings();
  return (
    <Screen title={t('settings.title')}>
      <Text style={styles.section}>{t('settings.language')}</Text>
      <ProviderPicker<Language>
        options={[
          { value: 'ru', label: t('settings.ru') },
          { value: 'en', label: t('settings.en') },
        ]}
        value={language}
        onChange={setLanguage}
      />
      <Text style={styles.section}>{t('settings.keys')}</Text>
      <Text style={styles.hint}>{t('settings.keysHint')}</Text>
      {PROVIDERS.map((p) => (
        <ProviderKeysForm key={p.id} provider={p} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: theme.colors.text, fontSize: theme.font.body, fontWeight: '700' },
  hint: { color: theme.colors.muted, fontSize: theme.font.small },
});
