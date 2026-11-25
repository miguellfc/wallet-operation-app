import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { BackHeader } from '@/components/settings/back-header';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Stagger } from '@/components/ui/stagger';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { confirmSignOut } from '@/features/auth/sign-out';
import { isLocal } from '@/lib/data-source';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const GLOWS = [
  { left: '8%', top: '30%' },
  { left: '82%', top: '24%' },
  { left: '84%', top: '48%' },
] as const;

const EXCHANGE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8h14m0 0l-4-4m4 4l-4 4M20 16H6m0 0l4-4m-4 4l4 4"/></svg>';

const CURRENCY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.66 2.69 3 6 3s6-1.34 6-3V7"/><path d="M3 11v4c0 1.66 2.69 3 6 3 1.07 0 2.07-.14 2.94-.39M15 11.5c.32-.03.66-.05 1-.05 3.31 0 6 1.34 6 3s-2.69 3-6 3-6-1.34-6-3"/><path d="M10 14.45v4c0 1.66 2.69 3 6 3s6-1.34 6-3v-4"/></g></svg>';

const CATEGORY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect width="7" height="7" x="3" y="3" rx="2"/><rect width="7" height="7" x="3" y="14" rx="2"/><rect width="7" height="7" x="14" y="14" rx="2"/><path stroke-linecap="round" d="M17.5 3v7M14 6.5h7"/></g></svg>';

const BACKUP_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M4 18V6m16 0v12"/><path d="M4 6c0 2.21 3.58 4 8 4s8-1.79 8-4-3.58-4-8-4-8 1.79-8 4Z"/><path d="M20 12c0 2.21-3.58 4-8 4s-8-1.79-8-4m16 6c0 2.21-3.58 4-8 4s-8-1.79-8-4"/></g></svg>';

const MOON_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" d="M21 14.5A9 9 0 0 1 9.5 3a9 9 0 1 0 11.5 11.5Z"/></svg>';

const UPDATE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"/><path d="M12 8v5l3 2"/></g></svg>';

const openCategories =() => router.navigate('/category-settings' as Href);

const openCurrency = () => router.navigate('/currency' as Href);

const openExchangeRates = () => router.navigate('/exchange-rates' as Href);

const openBackup = () => router.navigate('/backup' as Href);

const openAccount = () => router.navigate('/account' as Href);

const openTheme = () => router.navigate('/theme' as Href);

const openUpdate = () => router.navigate('/update' as Href);

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
  useThemeName();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <Stagger>
          <BackHeader title="Ajustes" />
          <View style={styles.list}>
            <Stagger>
              {!isLocal && (
                <SettingsCard
                  icon={<Image contentFit="contain" source={require('@/assets/icons/user-rounded.svg')} tintColor={colors.textInverse} style={styles.userIcon} />}
                  title="Mi cuenta"
                  detail="Administra tu información personal"
                  onPress={openAccount}
                />
              )}
              <SettingsCard
                icon={<SvgXml xml={CURRENCY_ICON} color={colors.textInverse} width={28} height={28} />}
                title="Moneda principal"
                detail="Cambia la moneda de tu saldo y tus estadísticas"
                onPress={openCurrency}
              />
              <SettingsCard
                icon={<SvgXml xml={EXCHANGE_ICON} color={colors.textInverse} width={30} height={30} />}
                title="Tasas de cambio"
                detail="Configura las tasas de cambio"
                onPress={openExchangeRates}
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
                onPress={openTheme}
              />
              {isLocal && (
                <SettingsCard
                  icon={<SvgXml xml={BACKUP_ICON} color={colors.textInverse} width={28} height={28} />}
                  title="Copia de seguridad"
                  detail="Exporta o importa tus datos en un archivo"
                  onPress={openBackup}
                />
              )}
              <SettingsCard
                icon={<SvgXml xml={UPDATE_ICON} color={colors.textInverse} width={28} height={28} />}
                title="Actualización"
                detail="Consulta tu versión y descarga la más reciente"
                onPress={openUpdate}
              />
            </Stagger>
          </View>
          {!isLocal && (
            <>
              <View style={styles.spacer} />
              <Pressable
                accessibilityRole="button"
                onPress={confirmSignOut}
                style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
                <Text style={styles.signOutLabel}>Cerrar sesión</Text>
              </Pressable>
            </>
          )}
        </Stagger>
      </RevealScrollView>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
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
    backgroundColor: colors.badge,
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
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutLabel: { ...typography.buttonLabel, color: colors.danger },
}));
