import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  css,
  cubicBezier,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { PressableScale } from '@/components/ui/pressable-scale';
import type { BiometricKind } from '@/features/lock/biometrics';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

const BACKSPACE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M3.49 15.18l.68 1.06c1.18 1.84 1.77 2.76 2.7 3.26C7.8 20 8.91 20 11.14 20h2.64c3.88 0 5.81 0 7.02-1.17C22 17.66 22 15.77 22 12s0-5.66-1.2-6.83C19.59 4 17.65 4 13.78 4h-2.64C8.91 4 7.8 4 6.87 4.5c-.93.5-1.52 1.42-2.7 3.26l-.68 1.06C2.5 10.37 2 11.14 2 12s.5 1.63 1.49 3.18Z"/><path d="M15.5 9.5L13 12m0 0l-2.5 2.5M13 12l-2.5-2.5M13 12l2.5 2.5"/></g></svg>';

const FINGERPRINT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M18.9 7a8 8 0 0 1 1.1 5v1a6 6 0 0 0 .8 3"/><path d="M8 11a4 4 0 0 1 8 0v1a10 10 0 0 0 2 6"/><path d="M12 11v2a14 14 0 0 0 2.5 8"/><path d="M8 15a18 18 0 0 0 1.8 6"/><path d="M4.9 19a22 22 0 0 1-.9-7v-1a8 8 0 0 1 12-6.95"/></g></svg>';

const FACE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M9 16c.85.63 1.88 1 3 1s2.15-.37 3-1"/><path d="M22 14c0 3.77 0 5.66-1.17 6.83C19.66 22 17.77 22 14 22M10 22c-3.77 0-5.66 0-6.83-1.17C2 19.66 2 17.77 2 14M10 2C6.23 2 4.34 2 3.17 3.17 2 4.34 2 6.23 2 10M14 2c3.77 0 5.66 0 6.83 1.17C22 4.34 22 6.23 22 10"/><path d="M9 9.5v2M15 9.5v2"/></g></svg>';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const KEY_SIZE = 72;

type PinPadProps = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  biometric?: BiometricKind | null;
  onBiometric?: () => void;
  shake?: number;
};

type KeyProps = { label: string; onPress: () => void; disabled?: boolean; children?: ReactNode };

function Key({ label, onPress, disabled, children }: KeyProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed, disabled && styles.keyDisabled]}>
      {children ?? <Text style={styles.keyLabel}>{label}</Text>}
    </PressableScale>
  );
}

export function PinPad({ length, value, onChange, disabled = false, biometric, onBiometric, shake = 0 }: PinPadProps) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (shake === 0 || reduced) return;
    offset.set(
      withSequence(
        withTiming(-8, { duration: 40 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      ),
    );
  }, [shake, reduced, offset]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const press = (digit: string) => {
    if (value.length < length) onChange(value + digit);
  };
  const erase = () => onChange(value.slice(0, -1));

  return (
    <View style={styles.root}>
      <Animated.View
        style={[styles.dots, shakeStyle]}
        accessible
        accessibilityLabel={`${value.length} de ${length} dígitos introducidos`}>
        {Array.from({ length }, (_, index) => (
          <Animated.View key={index} style={[styles.dot, motion.dot, index < value.length && styles.dotFilled]} />
        ))}
      </Animated.View>
      <View style={styles.grid}>
        {DIGITS.map(digit => (
          <Key key={digit} label={digit} onPress={() => press(digit)} disabled={disabled} />
        ))}
        {biometric && onBiometric ? (
          <Key
            label={biometric === 'face' ? 'Desbloquear con reconocimiento facial' : 'Desbloquear con huella'}
            onPress={onBiometric}
            disabled={disabled}>
            <SvgXml
              xml={biometric === 'face' ? FACE_ICON : FINGERPRINT_ICON}
              color={colors.textPrimary}
              width={30}
              height={30}
            />
          </Key>
        ) : (
          <View style={styles.keySpacer} />
        )}
        <Key label="0" onPress={() => press('0')} disabled={disabled} />
        <Key label="Borrar" onPress={erase} disabled={disabled || value.length === 0}>
          <SvgXml xml={BACKSPACE_ICON} color={colors.textPrimary} width={28} height={28} />
        </Key>
      </View>
    </View>
  );
}

const motion = css.create({
  dot: {
    transitionProperty: ['backgroundColor', 'borderColor', 'transform'],
    transitionDuration: 120,
    transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
  },
});

const styles = themedStyles(() => ({
  root: { alignItems: 'center', gap: 36 },
  dots: { flexDirection: 'row', gap: spacing.xl },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    transform: [{ scale: 1 }],
  },
  dotFilled: { backgroundColor: colors.brand, borderColor: colors.brand, transform: [{ scale: 1.15 }] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: KEY_SIZE * 3 + spacing.xxl * 2,
    columnGap: spacing.xxl,
    rowGap: spacing.lg,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: colors.trackOn },
  keyDisabled: { opacity: 0.4 },
  keySpacer: { width: KEY_SIZE, height: KEY_SIZE },
  keyLabel: { ...typography.titleStat, fontSize: 26, lineHeight: 32, color: colors.textPrimary },
}));
