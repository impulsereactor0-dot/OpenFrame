import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  title: string;
  hint: string;
}

export function ProgressCard({ title, hint }: Props) {
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { color: theme.colors.text, fontSize: theme.font.body, fontWeight: '600' },
  hint: { color: theme.colors.muted, fontSize: theme.font.small, textAlign: 'center' },
});
