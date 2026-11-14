import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, loading, disabled }: Props) {
  const blocked = !!loading || !!disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: !!loading }}
      disabled={blocked}
      onPress={onPress}
      style={[styles.btn, blocked && styles.disabled]}
    >
      {loading ? <ActivityIndicator color="#fff" style={styles.spinner} /> : null}
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radius,
  },
  disabled: { backgroundColor: theme.colors.primaryDisabled },
  spinner: { marginRight: theme.spacing.sm },
  text: { color: '#fff', fontSize: theme.font.body, fontWeight: '700' },
});
