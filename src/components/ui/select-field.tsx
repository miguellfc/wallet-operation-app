import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type SelectFieldProps = {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
};

export function SelectField({ label, value, placeholder, onPress }: SelectFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? placeholder }}
        onPress={onPress}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} style={styles.chevron} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  field: {
    minHeight: 50,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  value: { ...typography.bodyMedium, flex: 1, color: colors.textPrimary },
  placeholder: { color: colors.textMuted },
  chevron: { width: 11.5, height: 5.5, marginRight: 4 },
});
