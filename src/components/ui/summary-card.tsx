import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type SummaryCardProps = { kind: 'INCOME' | 'EXPENSE'; label: string; amount: string; caption?: string };

export function SummaryCard({ kind, label, amount, caption }: SummaryCardProps) {
  const income = kind === 'INCOME';
  const description = caption ? `${label}: ${amount}, ${caption}` : `${label}: ${amount}`;
  return (
    <View style={styles.card} accessible accessibilityLabel={description}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: income ? colors.incomeSoft : colors.expenseSoft }]}>
          <Image
            contentFit="contain"
            source={require('@/assets/icons/arrow-down.svg')}
            style={[styles.arrow, !income && styles.arrowUp]}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          <Text
            style={[styles.amount, { color: income ? colors.income : colors.expense }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}>
            {amount}
          </Text>
        </View>
      </View>
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 70,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { width: 33, height: 33, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 10, height: 10 },
  arrowUp: { transform: [{ rotate: '180deg' }] },
  content: { flex: 1 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  amount: typography.titleSection,
  caption: { ...typography.caption, color: colors.textMuted, paddingHorizontal: 6 },
});
