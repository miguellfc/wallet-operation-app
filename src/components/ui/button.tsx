import { ActivityIndicator, Text } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
};

export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary' }: ButtonProps) {
  const inactive = disabled || loading;
  const tint = variant === 'danger' ? colors.danger : variant === 'outline' ? colors.textAccent : colors.textOnBrand;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant !== 'primary' && styles.bordered,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={tint} />
      ) : (
        <Text style={[styles.label, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = themedStyles(() => ({
  button: {
    minHeight: 50,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordered: { backgroundColor: 'transparent', borderWidth: 1, paddingHorizontal: spacing.md },
  outline: { borderColor: colors.trackOn },
  danger: { borderColor: colors.danger },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { ...typography.buttonLabel, color: colors.textOnBrand },
}));
