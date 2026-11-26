import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BrandGradient } from '@/components/ui/brand-gradient';
import { AmountText, amountText, type Amount } from '@/components/ui/count-up';
import { colors, fonts, themedStyles, typography } from '@/theme';

export function BalanceCard({ amount }: { amount: Amount }) {
  return (
    <View style={styles.card} accessible accessibilityRole="summary" accessibilityLabel={`Balance ${amountText(amount)}`}>
      <BrandGradient radius={32} />
      <View style={styles.badge}>
        <Image contentFit="contain" source={require('@/assets/icons/card-badge.svg')} style={StyleSheet.absoluteFill} />
        <Image contentFit="contain" source={require('@/assets/icons/card-badge-icon.svg')} style={styles.badgeIcon} />
      </View>
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        Balance
      </Text>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
        <AmountText amount={amount} />
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
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
  // The Figma mark (18.78 x 24) at 26 high, centred in the left circle (centre 24.87, 24.87) as in logo.svg.
  badgeIcon: { position: 'absolute', left: 14.7, top: 11.87, width: 20.35, height: 26 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textOnBrand,
  },
  amount: { ...typography.displayAmount, color: colors.textOnBrand, marginTop: 4 },
}));
