import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

interface Props {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function PromptInput({ label, value, onChangeText, placeholder, editable = true }: Props) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        multiline
        maxLength={2000}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        editable={editable}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.muted, fontSize: theme.font.small, marginBottom: theme.spacing.xs },
  input: {
    minHeight: 110,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.font.body,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
