import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHeader } from '@/components/home/home-header';
import { DatePickerChip } from '@/components/operations/date-picker-chip';
import { DayBalanceCard } from '@/components/operations/day-balance-card';
import { groupByDay, OperationDayHeader } from '@/components/operations/operation-day-list';
import { OperationRow } from '@/components/operations/operation-row';
import { Button } from '@/components/ui/button';
import { FilterChips } from '@/components/ui/filter-chips';
import { Reveal } from '@/components/ui/reveal';
import { createRevealStore, REVEAL_VIEWABILITY, ViewReveal } from '@/components/ui/view-reveal';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SummaryCard } from '@/components/ui/summary-card';
import { loadRangeOperations, type Operation, type OperationsRange } from '@/features/operations/operations-api';
import { ApiError } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

type Filter = 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
  { value: 'TRANSFER', label: 'Transferencias' },
];

const EMPTY: Record<Filter, string> = {
  ALL: 'No hay movimientos',
  EXPENSE: 'No hay gastos',
  INCOME: 'No hay ingresos',
  TRANSFER: 'No hay transferencias',
};

const PAGE = 100;

const today = (): OperationsRange => {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { from: day, to: day };
};

const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

type Section = { key: string; day?: string; first: boolean; data: Operation[] };

const toSections = (operations: Operation[], singleDay: boolean): Section[] => {
  if (operations.length === 0) return [];
  if (singleDay) return [{ key: 'day', first: true, data: operations }];
  return groupByDay(operations).map((group, index) => ({
    key: group.day,
    day: group.day,
    first: index === 0,
    data: group.operations,
  }));
};

const Separator = () => <View style={styles.separator} />;

const GLOWS = [
  { left: '82%', top: '30%' },
  { left: '8%', top: '58%' },
  { left: '94%', top: '78%' },
] as const;

const openOperation = (id: string) =>
  router.navigate({ pathname: '/operation-detail', params: { id, at: String(Date.now()) } } as Href);

const countLabel = (count: number) => `${count} ${count === 1 ? 'operación' : 'operaciones'}`;

const matches = (operation: Operation, filter: Filter) => filter === 'ALL' || operation.type === filter;

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus movimientos. Vuelve a intentarlo en un momento.';
}

export default function OperationsScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ day?: string; at?: string }>();
  const [range, setRange] = useState(today);
  const [size, setSize] = useState(PAGE);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [opened, setOpened] = useState<string>();
  const [reveal] = useState(createRevealStore);
  useFocusEffect(reveal.replay);

  const request = `${params.day}:${params.at}`;
  const match = params.day?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match && request !== opened) {
    setOpened(request);
    const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    setRange({ from: day, to: day });
    setSize(PAGE);
    setFilter('ALL');
  }
  const changeRange = (next: OperationsRange) => {
    setRange(next);
    setSize(PAGE);
  };
  const singleDay = sameDay(range.from, range.to);
  const load = useCallback(() => loadRangeOperations(range, size), [range, size]);
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

  const loadingMore = data.hasMore && data.operations.length < size;
  const loadMore = () => {
    if (data.hasMore && data.operations.length === size && !error) setSize(size + PAGE);
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.top}>
        <HomeHeader name={data.firstName} />
        <View style={styles.subheader}>
          <Text style={styles.overline}>Cierre en tiempo real</Text>
          <DatePickerChip value={range} onChange={changeRange} />
        </View>
      </View>
      <Reveal index={0}>
        <DayBalanceCard
          label={singleDay ? 'Balance del día' : 'Balance al cierre'}
          amount={{ value: data.closingBalance, format: value => formatAmount(value, code) }}
          income={data.income}
          expense={data.expense}
        />
      </Reveal>
      <Reveal index={1} style={styles.totals}>
        <SummaryCard
          kind="INCOME"
          label="Ingresos"
          amount={{ value: data.income, format: value => formatAmount(value, code) }}
          caption={countLabel(incomeCount)}
        />
        <SummaryCard
          kind="EXPENSE"
          label="Gastos"
          amount={{ value: data.expense, format: value => formatAmount(value, code) }}
          caption={countLabel(expenseCount)}
        />
      </Reveal>
      <Reveal index={2}>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </Reveal>
    </View>
  );

  const footer = !data.hasMore ? undefined : loadingMore && error ? (
    <View style={styles.footer}>
      <Button label="Reintentar" onPress={retry} />
    </View>
  ) : loadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator color={colors.brand} accessibilityLabel="Cargando más movimientos" />
    </View>
  ) : undefined;

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <SectionList
        sections={toSections(visible, singleDay)}
        keyExtractor={operation => operation._id}
        renderItem={({ item }) => (
          <ViewReveal store={reveal} id={item._id}>
            <OperationRow operation={item} onPress={() => openOperation(item._id)} />
          </ViewReveal>
        )}
        viewabilityConfig={REVEAL_VIEWABILITY}
        onViewableItemsChanged={reveal.onViewableItemsChanged}
        onScroll={reveal.onScroll}
        scrollEventThrottle={32}
        renderSectionHeader={({ section }) =>
          section.day ? (
            <View style={section.first ? styles.sectionHeaderFirst : styles.sectionHeader}>
              <OperationDayHeader day={section.day} />
            </View>
          ) : null
        }
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.empty}>{`${EMPTY[filter]} ${singleDay ? 'este día' : 'en estas fechas'}`}</Text>
        }
        ListFooterComponent={footer}
        stickySectionHeadersEnabled={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={11}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.bgApp}
          />
        }
      />
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: spacing.xl, paddingBottom: spacing.xl },
  top: { gap: spacing.md },
  subheader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  overline: { ...typography.labelOverline, color: colors.textSecondary, flexShrink: 1 },
  totals: { flexDirection: 'row', gap: 21 },
  separator: { height: spacing.sm },
  sectionHeaderFirst: { paddingBottom: spacing.sm },
  sectionHeader: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  footer: { paddingTop: spacing.lg },
  empty: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xxl },
  state: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
