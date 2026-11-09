import { StyleSheet, Text, View } from 'react-native';

import { WalletIcon } from '@/components/wallets/wallet-icon';
import { softColor } from '@/features/wallets/wallet-options';
import { colors, radius, spacing, typography } from '@/theme';

type WalletCardProps = {
  name: string;
  amount: string;
  currencyCode: string;
  excluded: boolean;
  icon: string;
  color: string;
};

export function WalletCard({ name, amount, currencyCode, excluded, icon, color }: WalletCardProps) {
  const description = `${name}, ${amount} ${currencyCode}${excluded ? ', excluida del balance' : ''}`;
  return (
    <View style={[styles.card, excluded && styles.excluded]} accessible accessibilityLabel={description}>
      <View style={[styles.icon, { backgroundColor: softColor(color) }]}>
        <WalletIcon name={icon} color={color} size={18} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.amountRow}>
        <Text style={[styles.amount, styles.value]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {amount}
        </Text>
        <Text style={styles.amount}>{currencyCode}</Text>
      </View>
      {excluded && <Text style={styles.tag}>Excluida</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  excluded: { opacity: 0.55 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: { ...typography.bodyRegular, lineHeight: 20, color: colors.textSecondary },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, maxWidth: '100%' },
  value: { flexShrink: 1 },
  amount: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, color: colors.textPrimary },
  tag: { ...typography.caption, color: colors.textMuted },
});
