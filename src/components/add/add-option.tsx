import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { EASE_OUT } from '@/lib/motion';
import { colors, radius, themedStyles, typography } from '@/theme';

type AddOptionProps = {
  label: string;
  icon: ImageSource;
  iconWidth: number;
  iconHeight: number;
  onPress?: () => void;
};

const tapHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

export function AddOption({ label, icon, iconWidth, iconHeight, onPress }: AddOptionProps) {
  const available = !!onPress;
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const turn = useSharedValue(0);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  const press = () => {
    if (!onPress) return;
    tapHaptic();
    if (!reduced) {
      pop.set(
        withSequence(
          withTiming(1.18, { duration: 120, easing: EASE_OUT }),
          withSpring(1, { duration: 420, dampingRatio: 0.5 }),
        ),
      );
      turn.set(withSpring(turn.get() + 90, { duration: 550, dampingRatio: 0.6 }));
    }
    onPress();
  };

  return (
    <PressableScale
      disabled={!available}
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={`Añadir ${label.toLowerCase()}`}
      accessibilityHint={available ? undefined : 'Disponible próximamente'}
      accessibilityState={{ disabled: !available }}
      style={styles.card}>
      <Animated.View style={[styles.icon, iconStyle]}>
        <Image contentFit="contain" source={icon} style={{ width: iconWidth, height: iconHeight }} />
      </Animated.View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View style={plusStyle}>
        <Image contentFit="contain" source={require('@/assets/icons/plus.svg')} style={styles.plus} />
      </Animated.View>
    </PressableScale>
  );
}

const styles = themedStyles(() => ({
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
}));
