import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  secure?: boolean;
};

export function TextField({ label, secure = false, ...inputProps }: TextFieldProps) {
  const [hidden, setHidden] = useState(secure);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brand}
          secureTextEntry={hidden}
          style={styles.input}
          {...inputProps}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            hitSlop={12}
            onPress={() => setHidden(value => !value)}>
            <Image
              contentFit="contain"
              source={require('@/assets/icons/eye.svg')}
              style={[styles.eye, !hidden && styles.eyeActive]}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: { ...typography.bodyMedium, flex: 1, paddingVertical: spacing.md, color: colors.textPrimary },
  eye: { width: 26.5, height: 21.5 },
  eyeActive: { opacity: 0.6 },
});
