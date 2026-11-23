import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius, themedStyles, typography } from '@/theme';

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor: string;
  compact?: boolean;
};

type Layout = { x: number; width: number };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor,
  compact = false,
}: SegmentedControlProps<T>) {
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useSharedValue(false);
  const active = layouts[value];

  useEffect(() => {
    if (!active) return;
    if (!placed.get() || reduced) {
      x.set(active.x);
      width.set(active.width);
      placed.set(true);
      return;
    }
    x.set(withTiming(active.x, { duration: 250, easing: EASE_IN_OUT }));
    width.set(withTiming(active.width, { duration: 250, easing: EASE_IN_OUT }));
  }, [active, reduced, x, width, placed]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: placed.get() ? 1 : 0,
    width: width.get(),
    transform: [{ translateX: x.get() }],
  }));

  const measure = (key: string) => (event: LayoutChangeEvent) => {
    const { x: left, width: size } = event.nativeEvent.layout;
    setLayouts(current =>
      current[key]?.x === left && current[key]?.width === size ? current : { ...current, [key]: { x: left, width: size } },
    );
  };

  const select = (next: T) => {
    if (next === value) return;
    Haptics.selectionAsync().catch(() => null);
    onChange(next);
  };

  return (
    <View style={styles.track} accessibilityRole="tablist">
      <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: activeColor }, pillStyle]} />
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onLayout={measure(option.value)}
            onPress={() => select(option.value)}
            style={[styles.segment, selected && !active && { backgroundColor: activeColor }]}>
            <Text style={[styles.label, compact && styles.labelCompact, selected && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  track: {
    minHeight: 42,
    borderRadius: radius.full,
    backgroundColor: colors.segment,
    padding: 4,
    flexDirection: 'row',
  },
  pill: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: radius.full },
  segment: {
    flex: 1,
    minHeight: 34,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.segmentLabel, color: colors.textSecondary },
  labelCompact: { fontSize: 13, letterSpacing: 0.3 },
  labelActive: { color: colors.textOnBrand },
}));
