import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { confirmSignOut } from '@/features/auth/sign-out';
import { colors, layout, radius, spacing, typography } from '@/theme';

const DANGER = '#F99799';

const GLOWS = [
  { left: '8%', top: '30%' },
  { left: '82%', top: '24%' },
  { left: '84%', top: '48%' },
] as const;

const EXCHANGE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8h14m0 0l-4-4m4 4l-4 4M20 16H6m0 0l4-4m-4 4l4 4"/></svg>';

const CATEGORY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect width="7" height="7" x="3" y="3" rx="2"/><rect width="7" height="7" x="3" y="14" rx="2"/><rect width="7" height="7" x="14" y="14" rx="2"/><path stroke-linecap="round" d="M17.5 3v7M14 6.5h7"/></g></svg>';

const MOON_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" d="M21 14.5A9 9 0 0 1 9.5 3a9 9 0 1 0 11.5 11.5Z"/></svg>';

const openCategories = () => router.navigate('/category-settings' as Href);

type SettingsCardProps = { icon: ReactNode; title: string; detail: string; onPress?: () => void };

function SettingsCard({ icon, title, detail, onPress }: SettingsCardProps) {
  const disabled = !onPress;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityHint={disabled ? 'Disponible próximamente' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, disabled && styles.disabled, pressed && styles.pressed]}>
      <View style={styles.iconCircle}>{icon}</View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardDetail} numberOfLines={2}>
          {disabled ? `${detail} · Próximamente` : detail}
        </Text>
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <BackHeader title="Ajustes" />
        <View style={styles.list}>
          <SettingsCard
            icon={<Image contentFit="contain" source={require('@/assets/icons/user-rounded.svg')} tintColor={colors.textInverse} style={styles.userIcon} />}
            title="Mi cuenta"
            detail="Administra tu información personal"
          />
          <SettingsCard
            icon={<SvgXml xml={EXCHANGE_ICON} color={colors.textInverse} width={30} height={30} />}
            title="Tasas de cambio"
            detail="Configura las tasas de cambio"
          />
          <SettingsCard
            icon={<SvgXml xml={CATEGORY_ICON} color={colors.textInverse} width={28} height={28} />}
            title="Categoría"
            detail="Organiza y personaliza las categorías"
            onPress={openCategories}
          />
          <SettingsCard
            icon={<SvgXml xml={MOON_ICON} color={colors.textInverse} width={28} height={28} />}
            title="Tema"
            detail="Elige entre el modo claro y oscuro"
          />
        </View>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <Text style={styles.signOutLabel}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  list: { gap: 12 },
  card: {
    minHeight: 87,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIcon: { width: 30, height: 30 },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  cardDetail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  spacer: { flexGrow: 1, minHeight: spacing.xxl },
  signOut: {
    minHeight: 50,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: { ...typography.buttonLabel, color: DANGER },
});
