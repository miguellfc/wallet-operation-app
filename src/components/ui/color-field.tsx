import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GridSheet } from '@/components/ui/grid-sheet';
import { WALLET_COLORS } from '@/features/wallets/wallet-options';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type ColorFieldProps = { label: string; value: string; onChange: (value: string) => void };

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const name = WALLET_COLORS.find(item => item.value === value)?.label ?? value;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: name }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <View style={[styles.swatch, { backgroundColor: value }]} />
        <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} tintColor={colors.brand} style={styles.chevron} />
      </Pressable>
      <GridSheet
        visible={open}
        title={label}
        items={WALLET_COLORS}
        selected={value}
        renderItem={item => <View style={[styles.dot, { backgroundColor: item.value }]} />}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

const styles = themedStyles(() => ({
  container: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingLeft: 14,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  swatch: { flex: 1, height: 22, borderRadius: 5 },
  chevron: { width: 11.5, height: 5.5, marginRight: 4 },
  dot: { width: '60%', aspectRatio: 1, borderRadius: radius.full },
}));
