import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { operationSign, walletAmount } from '@/components/operations/operation-row';
import { InfoRow } from '@/components/ui/info-row';
import { TabScroll } from '@/components/wallets/tab-scroll';
import { loadRecurrences, type Recurrence, type RecurrenceItem } from '@/features/wallets/wallets-api';
import { formatAmount, longDayLabel } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing } from '@/theme';

const FREQUENCY: Record<Recurrence['recurrence'], string> = {
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

function describe({ recurrence, template }: RecurrenceItem) {
  const income = template?.type === 'INCOME';
  const title = template?.description || template?.category?.name || 'Operación recurrente';
  const next = recurrence.nextExecution ? `Próxima ejecución:\n${longDayLabel(recurrence.nextExecution)}` : 'Sin próxima ejecución';
  const amount = template
    ? formatAmount(walletAmount(template).amount, walletAmount(template).currency, operationSign(template.type))
    : '—';
  return {
    title,
    next,
    amount,
    icon: template?.category?.name ?? 'recurrente',
    color: income ? colors.income : template?.type === 'EXPENSE' ? colors.expense : colors.brand,
    background: income ? colors.categoryIconIncome : template?.type === 'EXPENSE' ? colors.categoryIcon : colors.incomeSoft,
  };
}

export function RecurrencesView({ header }: { header: ReactNode }) {
  const { data, error, retry, refresh, refreshing } = useApiData(loadRecurrences);

  return (
    <TabScroll
      header={header}
      loading={!data}
      error={error}
      empty={data && data.length === 0 ? 'No tienes operaciones recurrentes activas' : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
      onRetry={retry}>
      <View style={styles.list}>
        {data?.map(item => {
          const row = describe(item);
          const frequency = FREQUENCY[item.recurrence.recurrence];
          return (
            <InfoRow
              key={item.recurrence._id}
              icon={row.icon}
              iconColor={row.color}
              iconBackground={row.background}
              title={row.title}
              detail={row.next}
              amount={row.amount}
              caption={frequency}
              accessibilityLabel={`${row.title}, ${row.amount}, ${frequency}, ${row.next.replace('\n', ' ')}`}
            />
          );
        })}
      </View>
    </TabScroll>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
});
