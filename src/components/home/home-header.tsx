import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandGradient } from '@/components/ui/brand-gradient';
import { colors, radius, spacing, typography } from '@/theme';

type HomeHeaderProps = { name: string; onProfilePress: () => void };

export function HomeHeader({ name, onProfilePress }: HomeHeaderProps) {
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        onPress={onProfilePress}
        hitSlop={8}
        style={styles.avatar}>
        <Image contentFit="contain" source={require('@/assets/icons/user-rounded.svg')} style={styles.avatarIcon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 12px 0px rgba(92, 107, 192, 0.35)',
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
    boxShadow: '0px 0px 5px 0px rgba(186, 195, 255, 0.25)',
  },
  avatarIcon: { width: 22, height: 22 },
});
