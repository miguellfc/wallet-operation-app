import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  css,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { textOn } from '@/lib/color';
import { CSS_EASE_BACK, CSS_EASE_OUT, EASE_OUT } from '@/lib/motion';
import { colors, spacing, themedStyles, typography } from '@/theme';

const PLUS_ICON =
  '<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><path d="M14 0v28M27 14H1" stroke="currentColor" stroke-width="3"/></svg>';

type TabConfig = { label: string; icon: ImageSource; width: number; height: number };

const TABS: Record<string, TabConfig> = {
  index: { label: 'Inicio', icon: require('@/assets/icons/home.svg'), width: 29, height: 29 },
  statistics: { label: 'Estadística', icon: require('@/assets/icons/calendar.svg'), width: 30, height: 30 },
  wallets: { label: 'Billeteras', icon: require('@/assets/icons/wallet.svg'), width: 33, height: 33 },
  operations: { label: 'Operaciones', icon: require('@/assets/icons/operations.svg'), width: 26.875, height: 24.375 },
};

const PRESSED_SCALE = 0.86;

const tapHaptic =() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

function AddButton({ focused, onPress }: { focused: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const turn = useSharedValue(0);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel="Añadir"
      accessibilityState={{ selected: focused }}
      onPressIn={() => {
        if (!reduced) scale.set(withTiming(PRESSED_SCALE, { duration: 110, easing: EASE_OUT }));
      }}
      onPressOut={() => {
        if (reduced) return;
        scale.set(
          withSequence(
            withTiming(Math.min(scale.get(), PRESSED_SCALE), { duration: 80, easing: EASE_OUT }),
            withSpring(1, { duration: 450, dampingRatio: 0.45 }),
          ),
        );
      }}
      onPress={() => {
        tapHaptic();
        if (!reduced) turn.set(withSpring(turn.get() + 90, { duration: 550, dampingRatio: 0.6 }));
        onPress();
      }}
      style={styles.addSlot}>
      <Animated.View style={[styles.add, buttonStyle]}>
        <Animated.View style={iconStyle}>
          <SvgXml xml={PLUS_ICON} color={textOn(colors.brand)} width={28} height={28} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        if (route.name === 'add') {
          return (
            <AddButton key={route.key} focused={focused} onPress={() => navigateToTab(route.key)} />
          );
        }
        const tab = TABS[route.name];
        if (!tab) return null;
        return (
          <Fragment key={route.key}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => navigateToTab(route.key)}
              style={styles.tab}>
              <Animated.View style={[styles.iconSlot, motion.icon, focused && motion.iconActive]}>
                <Image
                  contentFit="contain"
                  source={tab.icon}
                  tintColor={focused ? colors.brand : colors.textMuted}
                  style={{ width: tab.width, height: tab.height }}
                />
              </Animated.View>
              <Animated.Text
                style={[styles.label, motion.label, !focused && styles.labelInactive]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}>
                {tab.label}
              </Animated.Text>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

const motion = css.create({
  icon: {
    transform: [{ translateY: 0 }, { scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: 200,
    transitionTimingFunction: CSS_EASE_OUT,
  },
  iconActive: {
    transform: [{ translateY: -2 }, { scale: 1.12 }],
    transitionDuration: 360,
    transitionTimingFunction: CSS_EASE_BACK,
  },
  label: { transitionProperty: 'color', transitionDuration: 200, transitionTimingFunction: CSS_EASE_OUT },
});

const styles = themedStyles(() => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgApp,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  iconSlot: { height: 33, justifyContent: 'center' },
  label: { ...typography.labelTab, color: colors.brand },
  labelInactive: { color: colors.textMuted },
  addSlot: { width: 86, alignItems: 'center' },
  add: {
    width: 74,
    height: 74,
    marginTop: -20,
    borderRadius: 37,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
