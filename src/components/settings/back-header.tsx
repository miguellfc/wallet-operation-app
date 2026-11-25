import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors, spacing, themedStyles, typography } from '@/theme';

const ARROW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 12H4m0 0l6-6m-6 6l6 6"/></svg>';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function BackHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={12}
        onPress={goBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <SvgXml xml={ARROW_ICON} color={colors.textPrimary} width={22} height={22} />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = themedStyles(() => ({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { marginLeft: spacing.xs },
  pressed: { opacity: 0.7 },
  title: { ...typography.titleStat, fontSize: 22, lineHeight: 28, color: colors.textPrimary, flexShrink: 1 },
  action: { marginLeft: 'auto' },
}));
