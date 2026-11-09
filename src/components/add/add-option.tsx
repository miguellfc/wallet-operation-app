import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

type AddOptionProps = {
  label: string;
  icon: ImageSource;
  iconWidth: number;
  iconHeight: number;
  onPress?: () => void;
};

export function AddOption({ label, icon, iconWidth, iconHeight, onPress }: AddOptionProps) {
  const available = !!onPress;
  return (
    <Pressable
      disabled={!available}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Añadir ${label.toLowerCase()}`}
      accessibilityHint={available ? undefined : 'Disponible próximamente'}
      accessibilityState={{ disabled: !available }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Image contentFit="contain" source={icon} style={{ width: iconWidth, height: iconHeight }} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Image contentFit="contain" source={require('@/assets/icons/plus.svg')} style={styles.plus} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 83,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingLeft: 35,
    paddingRight: 28,
    gap: 19,
  },
  pressed: { opacity: 0.85 },
  icon: {
    width: 45,
    height: 45,
    borderRadius: radius.full,
    backgroundColor: colors.incomeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.bodyRegular, fontSize: 16, flex: 1, color: colors.textSecondary },
  plus: { width: 16, height: 17 },
});
