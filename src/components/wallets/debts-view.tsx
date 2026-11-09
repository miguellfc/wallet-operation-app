import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { InfoRow } from '@/components/ui/info-row';
import { TabScroll } from '@/components/wallets/tab-scroll';
import { loadDebts, type Debt } from '@/features/wallets/wallets-api';
import { formatAmount } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, spacing } from '@/theme';

function describe(debt: Debt) {
  const lent = debt.type === 'LENT';
  return {
    title: lent ? `${debt.person} me debe` : `Le debo a ${debt.person}`,
    detail: debt.description || (lent ? 'Préstamo' : 'Deuda'),
    icon: lent ? 'me debe' : 'le debo',
    color: lent ? colors.income : colors.expense,
    background: lent ? colors.categoryIconIncome : colors.categoryIcon,
  };
}

export function DebtsView({ header }: { header: ReactNode }) {
  const { data, error, retry, refresh, refreshing } = useApiData(loadDebts);

  return (
    <TabScroll
      header={header}
      loading={!data}
      error={error}
      empty={data && data.length === 0 ? 'No tienes deudas pendientes' : undefined}
      refreshing={refreshing}
      onRefresh={refresh}
      onRetry={retry}>
      <View style={styles.list}>
        {data?.map(debt => {
          const row = describe(debt);
          const amount = formatAmount(debt.pending, debt.currency.code);
          return (
            <InfoRow
              key={debt._id}
              icon={row.icon}
              iconColor={row.color}
              iconBackground={row.background}
              title={row.title}
              detail={row.detail}
              amount={amount}
              accessibilityLabel={`${row.title}, ${row.detail}, pendiente ${amount}`}
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
