import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CategoryRow } from '@/components/ui/category-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import type { CategoryTotal, OperationKind } from '@/features/home/home-api';
import { formatAmount } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/theme';

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

  return (
    <View style={styles.section}>
      <SegmentedControl options={OPTIONS} value={kind} onChange={setKind} activeColor={color} />
      {rows.length === 0 ? (
        <Text style={styles.empty}>{income ? 'Aún no hay ingresos registrados' : 'Aún no hay gastos registrados'}</Text>
      ) : (
        <>
          <SegmentedProgress values={rows.map(item => item.total)} color={color} />
          <View style={styles.list}>
            {rows.map(item => (
              <CategoryRow
                key={item.category.id}
                name={item.category.name}
                amount={formatAmount(item.total, currencyCode)}
                percent={`${Math.round((item.total / total) * 100)}%`}
                color={color}
                iconBackground={income ? colors.categoryIconIncome : colors.categoryIcon}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.lg,
    gap: spacing.lg,
    boxShadow: '0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },
  list: { gap: 9 },
  empty: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
});
