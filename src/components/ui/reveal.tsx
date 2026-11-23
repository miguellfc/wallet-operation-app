import { useFocusEffect } from 'expo-router';
import { useCallback, type PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ScrollReveal, useScrollReveal } from '@/components/ui/scroll-reveal';
import { EASE_OUT, ENTER, enterDelay } from '@/lib/motion';

type RevealProps = PropsWithChildren<{ index?: number; style?: StyleProp<ViewStyle> }>;

export function Reveal({ index = 0, style, children }: RevealProps) {
  const scroll = useScrollReveal();
  if (scroll) {
    return (
      <ScrollReveal scroll={scroll} index={index} style={style}>
        {children}
      </ScrollReveal>
    );
  }
  return (
    <FocusReveal index={index} style={style}>
      {children}
    </FocusReveal>
  );
}

function FocusReveal({ index = 0, style, children }: RevealProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      if (reduced) return;
      progress.set(0);
      progress.set(withDelay(enterDelay(index), withTiming(1, { duration: ENTER.duration, easing: EASE_OUT })));
    }, [reduced, progress, index]),
  );

  const animated = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: value,
      transform: [{ translateY: (1 - value) * ENTER.distance }, { scale: ENTER.scale + (1 - ENTER.scale) * value }],
    };
  });

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
