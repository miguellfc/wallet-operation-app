import type { StackNavigationOptions } from 'expo-router/js-stack';
import { useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export function useSwipeBack(): StackNavigationOptions {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  return {
    animation: reduced ? 'fade' : 'slide_from_right',
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    gestureResponseDistance: Math.min(width * 0.3, 120),
  };
}
