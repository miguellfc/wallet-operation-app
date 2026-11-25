import { useEffect, type PropsWithChildren } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { EASE_OUT, ENTER, enterDelay } from '@/lib/motion';

type Listener = { show: (delay: number, direction: number) => void; hide: () => void };

type Token = { item: unknown; isViewable: boolean };

export type RevealStore = ReturnType<typeof createRevealStore>;

const idOf = (item: unknown) => (item && typeof item === 'object' && '_id' in item ? String(item._id) : null);

export function createRevealStore() {
  const visible = new Set<string>();
  const listeners = new Map<string, Listener>();
  let lastOffset = 0;
  let direction = 1;
  let scrolling = false;
  return {
    subscribe: (id: string, listener: Listener) => {
      listeners.set(id, listener);
      if (visible.has(id)) listener.show(0, direction);
      return () => {
        if (listeners.get(id) === listener) listeners.delete(id);
      };
    },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.y;
      if (offset !== lastOffset) direction = offset > lastOffset ? 1 : -1;
      lastOffset = offset;
      scrolling = true;
    },
    onViewableItemsChanged: ({ changed }: { changed: Token[] }) => {
      let step = 0;
      for (const token of changed) {
        const id = idOf(token.item);
        if (!id) continue;
        if (token.isViewable && !visible.has(id)) {
          visible.add(id);
          listeners.get(id)?.show(scrolling ? 0 : enterDelay(step++), direction);
        } else if (!token.isViewable && visible.has(id)) {
          visible.delete(id);
          listeners.get(id)?.hide();
        }
      }
    },
    replay: () => {
      scrolling = false;
      let step = 0;
      for (const id of visible) listeners.get(id)?.show(enterDelay(step++), 1);
    },
  };
}

export const REVEAL_VIEWABILITY = { itemVisiblePercentThreshold: 10 };

export function ViewReveal({ store, id, children }: PropsWithChildren<{ store: RevealStore; id: string }>) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  const direction = useSharedValue(1);

  useEffect(
    () =>
      store.subscribe(id, {
        show: (delay, from) => {
          if (reduced) return;
          direction.set(from);
          progress.set(0);
          progress.set(withDelay(delay, withTiming(1, { duration: ENTER.duration, easing: EASE_OUT })));
        },
        hide: () => {
          if (!reduced) progress.set(0);
        },
      }),
    [store, id, progress, direction, reduced],
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

  return <Animated.View style={animated}>{children}</Animated.View>;
}
