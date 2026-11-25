import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';

import { CSS_EASE_BACK, CSS_EASE_OUT } from '@/lib/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

export function PressableScale({
  style,
  onPressIn,
  onPressOut,
  pressRetentionOffset = 16,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      pressRetentionOffset={pressRetentionOffset}
      onPressIn={event => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[resolved, styles.motion, pressed && !reduced && styles.pressed]}
    />
  );
}

const styles = css.create({
  motion: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: 320,
    transitionTimingFunction: CSS_EASE_BACK,
  },
  pressed: { transform: [{ scale: 0.95 }], transitionDuration: 110, transitionTimingFunction: CSS_EASE_OUT },
});
