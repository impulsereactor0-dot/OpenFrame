import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{title}</Text>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.lg * 2 },
  title: { color: theme.colors.text, fontSize: theme.font.title, fontWeight: '700' },
});
