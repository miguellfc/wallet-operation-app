import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  css,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { textOn } from '@/lib/color';
import { CSS_EASE_OUT } from '@/lib/motion';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

type FilterChipsProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

type Layout = { x: number; width: number };

export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  const reduced = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useSharedValue(false);
  const active = layouts[value];
  const measured = options.every(option => layouts[option.value]);

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
    <View style={styles.row} accessibilityRole="tablist">
      {measured &&
        options.map(option => (
          <View
            key={`track:${option.value}`}
            pointerEvents="none"
            style={[styles.track, { left: layouts[option.value].x, width: layouts[option.value].width }]}
          />
        ))}
      <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={{ top: 10, bottom: 10 }}
            onLayout={measure(option.value)}
            onPress={() => select(option.value)}
            style={[styles.chip, !measured && (selected ? styles.chipActive : styles.chipIdle)]}>
            <Animated.Text style={[styles.label, motion.label, selected && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const motion = css.create({
  label: { transitionProperty: 'color', transitionDuration: 200, transitionTimingFunction: CSS_EASE_OUT },
});

const styles = themedStyles(() => ({
  row: { flexDirection: 'row', gap: spacing.sm },
  track: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: colors.surface },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.full, backgroundColor: colors.brand },
  chip: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIdle: { backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand },
  label: { ...typography.labelLegend, color: colors.textSecondary },
  labelActive: { color: textOn(colors.brand) },
}));
