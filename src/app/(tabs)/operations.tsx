import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { DatePickerChip } from '@/components/operations/date-picker-chip';
import { DayBalanceCard } from '@/components/operations/day-balance-card';
import { OperationRow } from '@/components/operations/operation-row';
import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/filter-chips';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SummaryCard } from '@/components/ui/summary-card';
import { confirmSignOut } from '@/features/auth/sign-out';
import { loadDayOperations, type Operation } from '@/features/operations/operations-api';
import { ApiError } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, spacing, typography } from '@/theme';

type Filter = 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'TRANSFER', label: 'Transferencias' },
];

const EMPTY: Record<Filter, string> = {
  ALL: 'No hay movimientos este día',
  EXPENSE: 'No hay gastos este día',
  INCOME: 'No hay ingresos este día',
  TRANSFER: 'No hay transferencias este día',
};

const GLOWS = [
  { left: '82%', top: '30%' },
  { left: '8%', top: '58%' },
  { left: '94%', top: '78%' },
] as const;

const countLabel = (count: number) => `${count} ${count === 1 ? 'transacción' : 'transacciones'}`;

const matches = (operation: Operation, filter: Filter) => filter === 'ALL' || operation.type === filter;

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus movimientos. Vuelve a intentarlo en un momento.';
}

export default function OperationsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string; at?: string }>();
  const [day, setDay] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>('ALL');
  const [opened, setOpened] = useState<string>();

  const request = `${params.day}:${params.at}`;
  const match = params.day?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match && request !== opened) {
    setOpened(request);
    setDay(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    setFilter('ALL');
  }
  const load = useCallback(() => loadDayOperations(day), [day]);
  const { data, error, retry, refresh, refreshing } = useApiData(load);

  if (!data) {
    return (
      <ScreenBackground glows={[...GLOWS]}>
        <View style={styles.state}>
          {error ? (
            <>
              <Text style={styles.stateText} accessibilityLiveRegion="polite">
                {loadErrorMessage(error)}
              </Text>
              <Button label="Reintentar" onPress={retry} />
            </>
          ) : (
            <ActivityIndicator color={colors.brand} />
          )}
        </View>
      </ScreenBackground>
    );
  }

  const code = data.currency.code;
  const incomeCount = data.operations.filter(operation => operation.type === 'INCOME').length;
  const expenseCount = data.operations.filter(operation => operation.type === 'EXPENSE').length;
  const visible = data.operations.filter(operation => matches(operation, filter));

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.bgApp}
          />
        }>
        <View style={styles.top}>
          <HomeHeader name={data.firstName} onProfilePress={confirmSignOut} />
          <View style={styles.subheader}>
            <Text style={styles.overline}>Cierre en tiempo real</Text>
            <DatePickerChip value={day} onChange={setDay} />
          </View>
        </View>
        <DayBalanceCard amount={formatAmount(data.closingBalance, code)} income={data.income} expense={data.expense} />
        <View style={styles.totals}>
          <SummaryCard
            kind="INCOME"
            label="Ingresos"
            amount={formatAmount(data.income, code)}
            caption={countLabel(incomeCount)}
          />
          <SummaryCard
            kind="EXPENSE"
            label="Gastos"
            amount={formatAmount(data.expense, code)}
            caption={countLabel(expenseCount)}
          />
        </View>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
        <View style={styles.list}>
          {visible.length === 0 ? (
            <Text style={styles.empty}>{EMPTY[filter]}</Text>
          ) : (
            visible.map(operation => <OperationRow key={operation._id} operation={operation} />)
          )}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  top: { gap: spacing.md },
  subheader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  overline: { ...typography.labelOverline, color: colors.textSecondary, flexShrink: 1 },
  totals: { flexDirection: 'row', gap: 21 },
  list: { gap: spacing.sm },
  empty: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxl },
  state: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
});
