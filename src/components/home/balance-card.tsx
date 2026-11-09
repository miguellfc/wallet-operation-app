import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandGradient } from '@/components/ui/brand-gradient';
import { colors, fonts, typography } from '@/theme';

export function BalanceCard({ amount }: { amount: string }) {
  return (
    <View style={styles.card} accessible accessibilityRole="summary" accessibilityLabel={`Balance ${amount}`}>
      <BrandGradient radius={32} />
      <View style={styles.badge}>
        <Image contentFit="contain" source={require('@/assets/icons/card-badge.svg')} style={StyleSheet.absoluteFill} />
        <Image contentFit="contain" source={require('@/assets/icons/card-badge-icon.svg')} style={styles.badgeIcon} />
      </View>
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        Balance
      </Text>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 161,
    borderRadius: 32,
    paddingHorizontal: 23,
    paddingTop: 76,
    paddingBottom: 21,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  badge: { position: 'absolute', top: 19, right: 15, width: 78, height: 49.74 },
  badgeIcon: { position: 'absolute', left: 10, top: 13, width: 30, height: 23 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textOnBrand,
  },
  amount: { ...typography.displayAmount, color: colors.textOnBrand, marginTop: 4 },
});
