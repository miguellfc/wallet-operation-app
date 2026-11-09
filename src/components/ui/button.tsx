import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, loading = false, disabled = false }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}>
      {loading ? (
        <ActivityIndicator color={colors.textOnBrand} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { ...typography.buttonLabel, color: colors.textOnBrand },
});
