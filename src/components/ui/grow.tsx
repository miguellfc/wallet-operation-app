import { useEffect, useState, type PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';

import { CSS_EASE_BACK, CSS_EASE_GENTLE, useReplayKey } from '@/lib/motion';

type GrowProps = PropsWithChildren<{
  axis?: 'x' | 'y' | 'both' | 'pop';
  delay?: number;
  once?: string;
  style?: StyleProp<ViewStyle>;
}>;

const grown = new Set<string>();

export function Grow({ axis = 'y', delay = 0, once, style, children }: GrowProps) {
  const reduced = useReducedMotion();
  const [fresh] = useState(() => !once || !grown.has(once));
  useEffect(() => {
    if (once) grown.add(once);
  }, [once]);
  const animate = !reduced && fresh;
  const replay = useReplayKey('charts');
  return (
    <Animated.View key={replay} style={[style, animate && motion[axis], animate && { animationDelay: delay }]}>
      {children}
    </Animated.View>
  );
}

const GROW_Y = css.keyframes({
  from: { opacity: 0, transform: [{ scaleY: 0 }] },
  '30%': { opacity: 1 },
  to: { opacity: 1, transform: [{ scaleY: 1 }] },
});

const GROW_X = css.keyframes({
  from: { transform: [{ scaleX: 0 }] },
  to: { transform: [{ scaleX: 1 }] },
});

const GROW_BOTH = css.keyframes({
  from: { opacity: 0, transform: [{ scale: 0.85 }, { rotate: '-20deg' }] },
  to: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
});

const POP = css.keyframes({
  from: { opacity: 0, transform: [{ scale: 0.4 }, { rotate: '-25deg' }] },
  to: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
});

const motion = css.create({
  y: {
    transformOrigin: 'bottom',
    animationName: GROW_Y,
    animationDuration: 1100,
    animationTimingFunction: CSS_EASE_GENTLE,
    animationFillMode: 'backwards',
  },
  x: {
    transformOrigin: 'left',
    animationName: GROW_X,
    animationDuration: 1100,
    animationTimingFunction: CSS_EASE_GENTLE,
    animationFillMode: 'backwards',
  },
  pop: {
    animationName: POP,
    animationDuration: 700,
    animationTimingFunction: CSS_EASE_BACK,
    animationFillMode: 'backwards',
  },
  both: {
    animationName: GROW_BOTH,
    animationDuration: 1200,
    animationTimingFunction: CSS_EASE_GENTLE,
    animationFillMode: 'backwards',
  },
});
