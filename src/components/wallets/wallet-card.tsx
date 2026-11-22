import { Pressable, Text, View } from 'react-native';

import { WalletIcon } from '@/components/wallets/wallet-icon';
import { softColor } from '@/features/wallets/wallet-options';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type WalletCardProps = {
  name: string;
  amount: string;
  currencyCode: string;
  excluded: boolean;
  icon: string;
  color: string;
  onPress?: () => void;
};

export function WalletCard({ name, amount, currencyCode, excluded, icon, color, onPress }: WalletCardProps) {
  const description = `${name}, ${amount} ${currencyCode}${excluded ? ', excluida del balance' : ''}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={description}
      style={({ pressed }) => [styles.card, excluded && styles.excluded, pressed && styles.pressed]}>
      <View style={[styles.icon, excluded && styles.faded, { backgroundColor: softColor(color) }]}>
        <WalletIcon name={icon} color={color} size={18} />
      </View>
      <Text style={[styles.name, excluded && styles.faded]} numberOfLines={1}>
        {name}
      </Text>
      <View style={[styles.amountRow, excluded && styles.faded]}>
        <Text style={[styles.amount, styles.value]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {amount}
        </Text>
        <Text style={styles.amount}>{currencyCode}</Text>
      </View>
      {excluded && (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Excluida del saldo</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = themedStyles(() => ({
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
  excluded: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.excludedBorder },
  faded: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
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
  badge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.expenseSoft,
  },
  badgeLabel: { ...typography.labelLegend, color: colors.expense },
}));
