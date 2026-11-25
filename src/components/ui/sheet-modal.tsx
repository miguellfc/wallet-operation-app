import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius, themedStyles } from '@/theme';

const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const OFFSCREEN = 2000;

function project(velocity: number) {
  'worklet';
  return ((velocity / 1000) * 0.998) / (1 - 0.998);
}

function rubberband(overshoot: number, dimension: number) {
  'worklet';
  return (overshoot * dimension * 0.55) / (dimension + 0.55 * Math.abs(overshoot));
}

const snapHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

type SheetModalProps = {
  visible: boolean;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

export function SheetModal({ visible, onClose, style, children }: SheetModalProps) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const opening = useRef(false);
  const height = useSharedValue(0);
  const translateY = useSharedValue(OFFSCREEN);
  const fade = useSharedValue(0);
  const context = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      opening.current = true;
      if (height.get() > 0) {
        opening.current = false;
        translateY.set(reduced ? 0 : withTiming(0, { duration: 300, easing: EASE_SHEET }));
        fade.set(withTiming(1, { duration: reduced ? 200 : 300, easing: EASE_SHEET }));
      }
      return;
    }
    const unmount = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(setMounted, false);
    };
    fade.set(withTiming(0, { duration: 220, easing: EASE_OUT }, reduced ? unmount : undefined));
    if (!reduced) translateY.set(withTiming(height.get() || OFFSCREEN, { duration: 220, easing: EASE_OUT }, unmount));
  }, [visible, mounted, reduced, height, translateY, fade]);

  const onLayout = (event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    height.set(measured);
    if (!opening.current || !visible) return;
    opening.current = false;
    if (reduced) {
      translateY.set(0);
    } else {
      translateY.set(measured);
      translateY.set(withTiming(0, { duration: 300, easing: EASE_SHEET }));
    }
    fade.set(withTiming(1, { duration: reduced ? 200 : 300, easing: EASE_SHEET }));
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .onStart(() => {
          context.set(translateY.get());
        })
        .onUpdate(event => {
          const next = context.get() + event.translationY;
          translateY.set(next >= 0 ? next : rubberband(next, height.get()));
        })
        .onEnd(event => {
          const projected = translateY.get() + project(event.velocityY);
          if (projected > height.get() * 0.4) {
            scheduleOnRN(onClose);
            return;
          }
          translateY.set(withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: event.velocityY }));
          scheduleOnRN(snapHaptic);
        }),
    [context, translateY, height, onClose],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      reduced || height.get() === 0
        ? fade.get()
        : fade.get() * interpolate(translateY.get(), [0, height.get()], [1, 0], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduced ? fade.get() : 1,
    transform: [{ translateY: reduced ? 0 : translateY.get() }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        {/* The sheet sits on top of the keyboard: padding lifts it, and a tall sheet (80% of the screen) shrinks
            to the space left instead of going off the top. */}
        <KeyboardAvoidingView behavior="padding" style={styles.root}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
          <Animated.View style={[style, sheetStyle]} onLayout={onLayout}>
            <GestureDetector gesture={pan}>
              <View style={styles.grabber}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  fill: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.scrim },
  grabber: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, marginVertical: -10 },
  handle: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.textMuted },
}));
