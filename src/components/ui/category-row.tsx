import { StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/category-icon';
import { colors, radius, spacing, typography } from '@/theme';

type CategoryRowProps = {
  name: string;
  amount: string;
  percent: string;
  color: string;
  iconBackground: string;
};

export function CategoryRow({ name, amount, percent, color, iconBackground }: CategoryRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${name}, ${amount}, ${percent}`}>
      <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
        <CategoryIcon name={name} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.amount} numberOfLines={1}>
          {amount}
        </Text>
      </View>
      <Text style={styles.percent}>{percent}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 80,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.row,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  iconBox: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  name: { ...typography.bodyMedium, color: colors.textPrimary },
  amount: { ...typography.bodyRegular, color: colors.textPrimary, opacity: 0.8 },
  percent: { ...typography.titleStat, color: colors.textPrimary, marginLeft: spacing.sm },
});
