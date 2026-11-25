import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, type PropsWithChildren } from 'react';
import { View, type LayoutChangeEvent, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { LegacyScrollView } from 'react-native-gesture-handler';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewProps } from 'react-native-keyboard-controller';
import Animated, {
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { EASE_OUT, ENTER, enterDelay } from '@/lib/motion';

type ScrollState = {
  offset: SharedValue<number>;
  height: SharedValue<number>;
  top: SharedValue<number>;
  content: SharedValue<number>;
  epoch: SharedValue<number>;
  moved: SharedValue<boolean>;
};

const ScrollRevealContext = createContext<ScrollState | null>(null);

const GestureScrollView = Animated.createAnimatedComponent(LegacyScrollView);

const EDGE = 32;

type Measurable = { measure?: (callback: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void };

function pageTop(event: LayoutChangeEvent, done: (pageY: number | null) => void) {
  const native = event.nativeEvent as { target?: unknown };
  const target = (event.currentTarget ?? native.target) as unknown as Measurable | null;
  if (!target?.measure) return done(null);
  target.measure((_x, _y, _w, _h, _pageX, pageY) => done(Number.isFinite(pageY) ? pageY : null));
}

export function useScrollReveal() {
  return useContext(ScrollRevealContext);
}

/** Space kept between the focused field and the top of the keyboard. */
const KEYBOARD_GAP = 24;

type RevealScrollViewProps = ScrollViewProps & {
  /** For screens with text fields: scrolls the focused field above the keyboard, on Android as well as iOS. */
  keyboardAware?: boolean;
};

export function RevealScrollView({
  children,
  onLayout,
  onContentSizeChange,
  keyboardAware = false,
  ...props
}: RevealScrollViewProps) {
  const offset = useSharedValue(0);
  const height = useSharedValue(0);
  const top = useSharedValue(0);
  const content = useSharedValue(0);
  const epoch = useSharedValue(0);
  const moved = useSharedValue(false);
  const anchor = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      anchor.set(offset.get());
      moved.set(false);
      epoch.set(epoch.get() + 1);
    }, [anchor, offset, moved, epoch]),
  );

  const onScroll = useAnimatedScrollHandler(event => {
    offset.set(event.contentOffset.y);
    if (!moved.get() && Math.abs(event.contentOffset.y - anchor.get()) > 4) moved.set(true);
  });

  const scrollProps = {
    ...props,
    onScroll,
    scrollEventThrottle: 16,
    onContentSizeChange: (width: number, contentHeight: number) => {
      content.set(contentHeight);
      onContentSizeChange?.(width, contentHeight);
    },
    onLayout: (event: LayoutChangeEvent) => {
      height.set(event.nativeEvent.layout.height);
      pageTop(event, pageY => top.set(pageY ?? 0));
      onLayout?.(event);
    },
  };

  return (
    <ScrollRevealContext value={{ offset, height, top, content, epoch, moved }}>
      {keyboardAware ? (
        <KeyboardAwareScrollView
          {...scrollProps}
          bottomOffset={KEYBOARD_GAP}
          keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'}
          ScrollViewComponent={GestureScrollView as unknown as KeyboardAwareScrollViewProps['ScrollViewComponent']}>
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <GestureScrollView {...scrollProps}>{children}</GestureScrollView>
      )}
    </ScrollRevealContext>
  );
}

type ScrollRevealProps = PropsWithChildren<{ scroll: ScrollState; index: number; style?: StyleProp<ViewStyle> }>;

export function ScrollReveal({ scroll, index, style, children }: ScrollRevealProps) {
  const reduced = useReducedMotion();
  const position = useSharedValue(0);
  const measured = useSharedValue(false);
  const size = useSharedValue(0);
  const progress = useSharedValue(reduced ? 1 : 0);
  const direction = useSharedValue(1);
  const shown = useSharedValue(false);

  useAnimatedReaction(
    () => {
      const start = position.get();
      const view = scroll.height.get();
      const offset = scroll.offset.get();
      let state = 0;
      if (measured.get() && view > 0) {
        const end = start + size.get();
        const atEnd = scroll.content.get() > 0 && offset + view >= scroll.content.get() - 2;
        if ((start < offset + view - EDGE || atEnd) && end > offset + EDGE) state = 1;
        else if ((start > offset + view && !atEnd) || end < offset) state = -1;
      }
      return { state, below: start > offset + view / 2, epoch: scroll.epoch.get() };
    },
    (current, previous) => {
      if (reduced) return;
      if (previous && current.epoch !== previous.epoch && shown.get()) {
        shown.set(false);
        progress.set(0);
      }
      if (current.state === 1 && !shown.get()) {
        shown.set(true);
        direction.set(current.below ? 1 : -1);
        progress.set(0);
        const delay = scroll.moved.get() ? 0 : enterDelay(index);
        progress.set(withDelay(delay, withTiming(1, { duration: ENTER.duration, easing: EASE_OUT })));
      } else if (current.state === -1 && shown.get()) {
        shown.set(false);
        progress.set(0);
      }
    },
  );

  const animated = useAnimatedStyle(() => {
    const value = progress.get();
    return {
      opacity: value,
      transform: [
        { translateY: (1 - value) * ENTER.distance * direction.get() },
        { scale: ENTER.scale + (1 - ENTER.scale) * value },
      ],
    };
  });

  const onLayout = (event: LayoutChangeEvent) => {
    const { y, height, width } = event.nativeEvent.layout;
    if (height === 0 && width === 0) return;
    size.set(height);
    pageTop(event, pageY => {
      position.set(pageY === null ? y : pageY - scroll.top.get() + scroll.offset.get());
      measured.set(true);
    });
  };

  return (
    <View onLayout={onLayout}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </View>
  );
}
