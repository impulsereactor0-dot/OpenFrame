import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  uri: string | null;
  pickLabel: string;
  changeLabel: string;
  removeLabel: string;
  onPick: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ImagePickerField({ uri, pickLabel, changeLabel, removeLabel, onPick, onRemove, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      {uri ? <Image source={{ uri }} style={styles.preview} resizeMode="cover" /> : null}
      <View style={styles.row}>
        <Pressable disabled={disabled} onPress={onPick} style={[styles.btn, disabled && styles.dim]}>
          <Text style={styles.text}>{uri ? changeLabel : pickLabel}</Text>
        </Pressable>
        {uri ? (
          <Pressable disabled={disabled} onPress={onRemove} style={[styles.btn, disabled && styles.dim]}>
            <Text style={styles.text}>{removeLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  preview: { width: '100%', height: 200, borderRadius: theme.radius, backgroundColor: theme.colors.card },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  dim: { opacity: 0.6 },
  text: { color: theme.colors.text, fontSize: theme.font.body },
});
