import * as Haptics from 'expo-haptics';
import { useMemo, type PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PERIODS } from '@/components/statistics/stat-blocks';
import type { StatsPeriod } from '@/features/statistics/statistics-api';
import { EASE_OUT } from '@/lib/motion';

/** How far the content follows the finger: a quarter of the drag, so it reads as a hint, not as a page. */
const FOLLOW = 0.25;

/** Past an end (Semana or Año) the content resists more and springs back. */
const EDGE_FOLLOW = 0.1;

const COMMIT_DISTANCE = 60;

const COMMIT_VELOCITY = 500;

/** The new period slides in from the side the finger went to. */
const ENTER_DISTANCE = 24;

const commitHaptic = () => Haptics.selectionAsync().catch(() => null);

type PeriodSwipeProps = PropsWithChildren<{
  period: StatsPeriod;
  onPeriod: (period: StatsPeriod) => void;
  /** Width of the left edge left to the stack's swipe-back gesture. */
  edgeInset?: number;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Swipe left or right over the statistics to move between Semana, Mes and Año. Horizontal only: a vertical move
 * fails the gesture so the scroll view keeps it, and taps on the charts never activate it.
 */
export function PeriodSwipe({ period, onPeriod, edgeInset = 0, style, children }: PeriodSwipeProps) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);
  const index = PERIODS.findIndex(item => item.value === period);

  const pan = useMemo(() => {
    const hasPrevious = index > 0;
    const hasNext = index < PERIODS.length - 1;
    const commit = (direction: number) => {
      commitHaptic();
      onPeriod(PERIODS[index + direction].value);
    };

    return Gesture.Pan()
      .activeOffsetX([-20, 20])
      .failOffsetY([-12, 12])
      .hitSlop({ left: -edgeInset })
      .onUpdate(event => {
        if (reduced) return;
        const blocked = event.translationX < 0 ? !hasNext : !hasPrevious;
        x.set(event.translationX * (blocked ? EDGE_FOLLOW : FOLLOW));
      })
      .onEnd(event => {
        const towardNext = event.translationX < 0;
        const allowed = towardNext ? hasNext : hasPrevious;
        const far = Math.abs(event.translationX) > COMMIT_DISTANCE;
        const fast =
          Math.abs(event.velocityX) > COMMIT_VELOCITY && Math.sign(event.velocityX) === Math.sign(event.translationX);
        if (allowed && (far || fast)) {
          if (!reduced) {
            x.set(towardNext ? ENTER_DISTANCE : -ENTER_DISTANCE);
            x.set(withTiming(0, { duration: 220, easing: EASE_OUT }));
          }
          opacity.set(0.4);
          opacity.set(withTiming(1, { duration: 220, easing: EASE_OUT }));
          scheduleOnRN(commit, towardNext ? 1 : -1);
          return;
        }
        x.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX * FOLLOW }));
      });
  }, [index, onPeriod, edgeInset, reduced, x, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: x.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
