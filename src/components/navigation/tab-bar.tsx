import { Image, type ImageSource } from 'expo-image';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Fragment } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { css } from 'react-native-reanimated';

import { CSS_EASE_BACK, CSS_EASE_OUT } from '@/lib/motion';
import { colors, spacing, themedStyles, typography } from '@/theme';

type TabConfig = { label: string; icon: ImageSource; width: number; height: number };

const TABS: Record<string, TabConfig> = {
  index: { label: 'Inicio', icon: require('@/assets/icons/home.svg'), width: 29, height: 29 },
  statistics: { label: 'Estadística', icon: require('@/assets/icons/calendar.svg'), width: 30, height: 30 },
  wallets: { label: 'Billeteras', icon: require('@/assets/icons/wallet.svg'), width: 33, height: 33 },
  operations: { label: 'Operaciones', icon: require('@/assets/icons/operations.svg'), width: 26.875, height: 24.375 },
};

export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        if (route.name === 'add') {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel="Añadir"
              accessibilityState={{ selected: focused }}
              onPress={() => navigateToTab(route.key)}
              style={styles.addSlot}>
              <Image contentFit="contain" source={require('@/assets/icons/add-button.svg')} style={styles.add} />
            </Pressable>
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
  add: { width: 74, height: 74, marginTop: -20 },
}));
