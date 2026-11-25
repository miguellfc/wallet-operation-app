import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BrandGradient } from '@/components/ui/brand-gradient';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type HomeHeaderProps = { name: string; showProfile?: boolean; onProfilePress?: () => void };

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
          <Image contentFit="contain" source={require('@/assets/icons/user-rounded.svg')} style={styles.avatarIcon} />
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
  avatarIcon: { width: 22, height: 22 },
}));
