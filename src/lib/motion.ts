import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useState } from 'react';
import { cubicBezier, Easing } from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
export const CSS_EASE_BACK = cubicBezier(0.34, 1.56, 0.64, 1);
export const CSS_EASE_GENTLE = cubicBezier(0.33, 1, 0.68, 1);

export const ENTER = { duration: 650, distance: 48, scale: 0.92, stagger: 70, maxSteps: 8 };

export function enterDelay(index: number) {
  'worklet';
  return Math.min(Math.max(index, 0), ENTER.maxSteps) * ENTER.stagger;
}

export const valuesKey = (values: number[]) => values.map(value => Math.round(value * 100)).join(':');

export const sameValue = (a: number, b: number) => Math.round(a * 100) === Math.round(b * 100);

export function useFocusCount() {
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setCount(current => current + 1);
    }, []),
  );
  return count;
}

type Replay = { counts: boolean; charts: boolean };

const ReplayContext = createContext<Replay>({ counts: true, charts: true });

export const ReplayOnFocus = ReplayContext.Provider;

export function useReplayKey(kind: keyof Replay) {
  const replay = useContext(ReplayContext)[kind];
  const focus = useFocusCount();
  return replay ? Math.max(focus, 1) : 1;
}
