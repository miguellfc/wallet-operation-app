import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { BrandGradient } from '@/components/ui/brand-gradient';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type HomeHeaderProps = { name: string; showProfile?: boolean; onProfilePress?: () => void };

// A user with a gear: the button opens Ajustes, which starts with "Mi cuenta".
const SETTINGS_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><circle cx="11" cy="7" r="4"/><path d="M4 21v-1.5A4.5 4.5 0 0 1 8.5 15h3.5"/><circle cx="18" cy="18.5" r="2"/><path d="M18 15v1.5m0 4V22m3.03-5.25l-1.3.75m-3.46 2l-1.3.75m0-3.5l1.3.75m3.46 2l1.3.75"/></g></svg>';

const openSettings = () => router.navigate('/settings' as Href);

export function HomeHeader({ name, showProfile = true, onProfilePress = openSettings }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.greeting}>
        <View style={styles.mark}>
          <BrandGradient radius={radius.md} x1={0.05} y1={0.62} x2={0.95} y2={0.38} />
          <Image contentFit="contain" source={require('@/assets/icons/logo-mark.svg')} style={styles.markIcon} />
        </View>
        <View>
          <Text style={styles.overline}>Hola</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>
      {showProfile && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          onPress={onProfilePress}
          hitSlop={8}
          style={styles.avatar}>
          <SvgXml xml={SETTINGS_ICON} color={colors.textOnBrand} width={20} height={20} />
        </Pressable>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 0px 12px 0px ${colors.shadowGlow}`,
  },
  markIcon: { width: 20.17, height: 15.58 },
  overline: { ...typography.labelOverline, color: colors.textAccent },
  name: { ...typography.titleSection, color: colors.textPrimary },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0px 0px 5px 0px ${colors.shadowAvatar}`,
  },
}));
