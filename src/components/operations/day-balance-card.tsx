import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '@/theme';

type DayBalanceCardProps = { amount: string; income: number; expense: number };

export function DayBalanceCard({ amount, income, expense }: DayBalanceCardProps) {
  const total = income + expense;
  return (
    <View style={styles.card} accessible accessibilityRole="summary" accessibilityLabel={`Balance del día ${amount}`}>
      <Image contentFit="contain" source={require('@/assets/icons/logo.svg')} style={styles.badge} />
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        Balance del día
      </Text>
      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {amount}
      </Text>
      <View style={styles.bar}>
        {total === 0 ? (
          <View style={[styles.segment, styles.empty]} />
        ) : (
          <>
            {income > 0 && <View style={[styles.segment, { flexGrow: income, backgroundColor: colors.income }]} />}
            {expense > 0 && <View style={[styles.segment, { flexGrow: expense, backgroundColor: colors.expense }]} />}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 161,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: 23,
    paddingTop: 35,
    paddingBottom: 33,
  },
  badge: { position: 'absolute', top: 19, right: 15, width: 78, height: 49.74 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  amount: { ...typography.displayAmount, color: colors.textInverse, marginTop: 4, marginRight: 70 },
  bar: { flexDirection: 'row', gap: spacing.sm, height: 5, marginTop: spacing.xl },
  segment: { flexBasis: 0, minWidth: 5, height: '100%', borderRadius: radius.full },
  empty: { flexGrow: 1, backgroundColor: colors.surface },
});
