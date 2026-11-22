import { useState } from 'react';
import { Text, View } from 'react-native';

import { CategoryRow } from '@/components/ui/category-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import type { CategoryTotal, OperationKind } from '@/features/home/home-api';
import { softColor } from '@/features/wallets/wallet-options';
import { formatAmount } from '@/lib/format';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

const OPTIONS: [{ value: OperationKind; label: string }, { value: OperationKind; label: string }] = [
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
];

type CategoryBreakdownProps = { categories: CategoryTotal[]; currencyCode: string };

export function CategoryBreakdown({ categories, currencyCode }: CategoryBreakdownProps) {
  const [kind, setKind] = useState<OperationKind>('EXPENSE');
  const income = kind === 'INCOME';
  const color = income ? colors.income : colors.expense;
  const rows = categories.filter(item => item.type === kind);
  const total = rows.reduce((sum, item) => sum + item.total, 0);
  const colorOf = (item: CategoryTotal) => (/^#[0-9a-f]{3,8}$/i.test(item.category.color) ? item.category.color : color);

  return (
    <View style={styles.section}>
      <SegmentedControl options={OPTIONS} value={kind} onChange={setKind} activeColor={color} />
      {rows.length === 0 ? (
        <Text style={styles.empty}>{income ? 'Aún no hay ingresos registrados' : 'Aún no hay gastos registrados'}</Text>
      ) : (
        <>
          <SegmentedProgress segments={rows.map(item => ({ value: item.total, color: colorOf(item) }))} />
          <View style={styles.list}>
            {rows.map(item => (
              <CategoryRow
                key={item.category.id}
                name={item.category.name}
                icon={item.category.icon}
                amount={formatAmount(item.total, currencyCode)}
                percent={`${Math.round((item.total / total) * 100)}%`}
                color={colorOf(item)}
                iconBackground={softColor(colorOf(item), 0.1)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  section: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.lg,
    gap: spacing.lg,
    boxShadow: `0px 20px 25px -5px ${colors.shadowCard}, 0px 8px 10px -6px ${colors.shadowCard}`,
  },
  list: { gap: 9 },
  empty: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
}));
