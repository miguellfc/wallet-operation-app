import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { Button } from '@/components/ui/button';
import { SheetModal } from '@/components/ui/sheet-modal';
import { DEFAULT_WALLET_COLOR, WALLET_COLORS } from '@/features/wallets/wallet-options';
import { onColor } from '@/lib/color';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

const SWATCH = 52;

const GAP = 18;

const STRIDE = SWATCH + GAP;

const FOCUS_SCALE = 1.35;

const IS_WEB = Platform.OS === 'web';

const LAST = WALLET_COLORS.length - 1;

const indexOf = (value: string) => {
  const found = WALLET_COLORS.findIndex(item => item.value.toLowerCase() === value.toLowerCase());
  return found >= 0 ? found : WALLET_COLORS.findIndex(item => item.value === DEFAULT_WALLET_COLOR);
};

const nameOf = (value: string) =>
  WALLET_COLORS.find(item => item.value.toLowerCase() === value.toLowerCase())?.label ?? value;

const tick = () => Haptics.selectionAsync().catch(() => null);

type ColorFieldProps = { label: string; value: string; onChange: (value: string) => void };

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  const name = nameOf(value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: name }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <View style={[styles.swatch, { backgroundColor: value }]} />
        <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} tintColor={colors.brand} style={styles.chevron} />
      </Pressable>
      <ColorSheet visible={open} title={label} value={value} onSelect={onChange} onClose={() => setOpen(false)} />
    </View>
  );
}

type ColorSheetProps = {
  visible: boolean;
  title: string;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function ColorSheet({ visible, title, value, onSelect, onClose }: ColorSheetProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => indexOf(value));
  const [width, setWidth] = useState(0);
  const [opened, setOpened] = useState(false);
  const strip = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(indexOf(value) * STRIDE);
  const current = useSharedValue(indexOf(value));
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (visible && !opened) {
    setOpened(true);
    setIndex(indexOf(value));
  } else if (!visible && opened) {
    setOpened(false);
  }

  useEffect(() => {
    if (!visible || width === 0) return;
    const start = indexOf(value);
    current.set(start);
    offset.set(start * STRIDE);
    scheduleOnUI(() => {
      'worklet';
      scrollTo(strip, start * STRIDE, 0, false);
    });
  }, [visible, width, value, strip, current, offset]);

  useEffect(
    () => () => {
      if (settle.current) clearTimeout(settle.current);
    },
    [],
  );

  const center = (next: number, animated: boolean) => {
    scheduleOnUI(() => {
      'worklet';
      scrollTo(strip, next * STRIDE, 0, animated);
    });
  };

  const pick = (next: number) => {
    setIndex(next);
    tick();
  };

  const snapLater = (x: number) => {
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => center(Math.min(Math.max(Math.round(x / STRIDE), 0), LAST), !reduced), 120);
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: event => {
      const x = event.contentOffset.x;
      offset.set(x);
      const next = Math.min(Math.max(Math.round(x / STRIDE), 0), LAST);
      if (next !== current.get()) {
        current.set(next);
        scheduleOnRN(pick, next);
      }
      if (IS_WEB) scheduleOnRN(snapLater, x);
    },
  });

  const choose = (next: number) => {
    if (next !== current.get()) {
      current.set(next);
      pick(next);
    }
    center(next, !reduced);
  };

  const confirm = () => {
    onSelect(WALLET_COLORS[index].value);
    onClose();
  };

  const selected = WALLET_COLORS[index];
  const side = Math.max((width - SWATCH) / 2, 0);

  return (
    <SheetModal visible={visible} onClose={onClose} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={[styles.preview, { backgroundColor: selected.value }]}>
        <Text style={[styles.previewName, { color: onColor(selected.value) }]} accessibilityLiveRegion="polite">
          {selected.label}
        </Text>
        <Text style={[styles.previewHex, { color: onColor(selected.value) }]}>{selected.value.toUpperCase()}</Text>
      </View>
      <View style={styles.stripFrame} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        <View pointerEvents="none" style={styles.focus} />
        {width > 0 && (
          <Animated.ScrollView
            ref={strip}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            snapToInterval={STRIDE}
            decelerationRate="fast"
            contentContainerStyle={[styles.strip, { paddingHorizontal: side }]}>
            {WALLET_COLORS.map((item, position) => (
              <Swatch
                key={item.value}
                color={item.value}
                label={item.label}
                position={position}
                offset={offset}
                active={position === index}
                onPress={() => choose(position)}
              />
            ))}
          </Animated.ScrollView>
        )}
      </View>
      <Text style={styles.hint}>Desliza o toca un color</Text>
      <Button label="Listo" onPress={confirm} />
    </SheetModal>
  );
}

type SwatchProps = {
  color: string;
  label: string;
  position: number;
  offset: SharedValue<number>;
  active: boolean;
  onPress: () => void;
};

function Swatch({ color, label, position, offset, active, onPress }: SwatchProps) {
  const animated = useAnimatedStyle(() => {
    const distance = Math.abs(offset.get() / STRIDE - position);
    return {
      opacity: interpolate(distance, [0, 3], [1, 0.45], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 1, 2], [FOCUS_SCALE, 0.92, 0.8], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 12, bottom: 12, left: GAP / 2, right: GAP / 2 }}
      onPress={onPress}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, animated]} />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  container: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingLeft: 14,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  swatch: { flex: 1, height: 22, borderRadius: 5 },
  chevron: { width: 11.5, height: 5.5, marginRight: 4 },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.bgApp,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  title: { ...typography.titleSection, color: colors.textPrimary },
  preview: { height: 112, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: 2 },
  previewName: { ...typography.titleStat },
  previewHex: { ...typography.labelLegend, opacity: 0.7 },
  stripFrame: { height: SWATCH * FOCUS_SCALE + spacing.xxl, marginHorizontal: -spacing.xl, justifyContent: 'center' },
  focus: {
    position: 'absolute',
    alignSelf: 'center',
    width: SWATCH * FOCUS_SCALE + 12,
    height: SWATCH * FOCUS_SCALE + 12,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  strip: { alignItems: 'center', gap: GAP },
  dot: { width: SWATCH, height: SWATCH, borderRadius: radius.full },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
}));
