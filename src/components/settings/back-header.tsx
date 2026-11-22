import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { HomeHeader } from '@/components/home/home-header';
import { loadProfile } from '@/features/wallets/wallets-api';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing, typography } from '@/theme';

const ARROW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 12H4m0 0l6-6m-6 6l6 6"/></svg>';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function BackHeader({ title }: { title: string }) {
  const { data: profile } = useApiData(loadProfile);

  return (
    <View style={styles.header}>
      <HomeHeader name={profile?.firstName ?? ''} showProfile={false} />
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={10}
          onPress={goBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <SvgXml xml={ARROW_ICON} color={colors.textPrimary} width={22} height={22} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 17 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { marginLeft: spacing.xs },
  pressed: { opacity: 0.7 },
  title: { ...typography.titleSection, color: colors.textPrimary, flexShrink: 1 },
});
