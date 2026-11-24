import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { operationSign, walletAmount } from '@/components/operations/operation-row';
import { InfoRow } from '@/components/ui/info-row';
import { Reveal } from '@/components/ui/reveal';
import { TabScroll } from '@/components/wallets/tab-scroll';
import { loadRecurrences, type Recurrence, type RecurrenceItem } from '@/features/wallets/wallets-api';
import { formatAmount, longDayLabel } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing, themedStyles } from '@/theme';
import { useCategoryColor } from '@/features/categories/category-colors';
import { softColor } from '@/features/wallets/wallet-options';

const openRecurrence = (id: string) =>
  router.navigate({ pathname: '/recurrence-detail', params: { id, at: String(Date.now()) } } as Href);

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

export function RecurrencesView({ header }: { header?: ReactNode }) {
  const { data, error, retry, refresh, refreshing } = useApiData(loadRecurrences);
  const categoryColor = useCategoryColor();

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
        {data?.map((item, index) => {
          const row = describe(item);
          const frequency = FREQUENCY[item.recurrence.recurrence];
          return (
            <Reveal key={item.recurrence._id} index={index}>
              <InfoRow
                icon={row.icon}
                iconColor={item.template?.category ? categoryColor(item.template.category, row.color) : row.color}
                iconBackground={
                  item.template?.category ? softColor(categoryColor(item.template.category, row.color), 0.12) : row.background
                }
                title={row.title}
                detail={row.next}
                amount={row.amount}
                caption={frequency}
                accessibilityLabel={`${row.title}, ${row.amount}, ${frequency}, ${row.next.replace('\n', ' ')}`}
                onPress={() => openRecurrence(item.recurrence._id)}
              />
            </Reveal>
          );
        })}
      </View>
    </TabScroll>
  );
}

const styles = themedStyles(() => ({
  list: { gap: spacing.sm },
}));
