import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { BalanceCard } from '@/components/home/balance-card';
import { CashFlowChart } from '@/components/home/cash-flow-chart';
import { CategoryBreakdown } from '@/components/home/category-breakdown';
import { StickyHeader } from '@/components/home/sticky-header';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Skeleton, SkeletonChart, SkeletonHero, SkeletonSummaryPair } from '@/components/ui/skeleton';
import { SummaryCard } from '@/components/ui/summary-card';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { loadCashFlow, loadHome, type CashFlowInterval, type CategoryTotal } from '@/features/home/home-api';
import { useLockState } from '@/features/lock/lock-store';
import { isLocal } from '@/lib/data-source';
import { ReplayOnFocus } from '@/lib/motion';
import { formatAmount } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, spacing, themedStyles, typography } from '@/theme';
import { useThemeName } from '@/features/theme/theme-store';

const HOME_REPLAY = { counts: false, charts: false };

const GLOWS = [
  { left: '82%', top: '32%' },
  { left: '8%', top: '80%' },
  { left: '94%', top: '62%' },
] as const;

const totalOf = (categories: CategoryTotal[], type: CategoryTotal['type']) =>
  categories.filter(item => item.type === type).reduce((sum, item) => sum + item.total, 0);

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus datos. Vuelve a intentarlo en un momento.';
}


export default function HomeScreen() {
  useThemeName();
  const { data, error, retry, refresh, refreshing } = useApiData(loadHome);
  const [interval, setInterval] = useState<CashFlowInterval>('MONTH');
  const loadFlow = useCallback(() => loadCashFlow(interval), [interval]);
  const { data: flow, refresh: refreshFlow } = useApiData(loadFlow);
  const { pinSet, locked } = useLockState();
  const covered = isLocal && (!pinSet || locked);

  if (!data) {
    return (
      <ScreenBackground glows={[...GLOWS]}>
        <StickyHeader />
        {error ? (
          <View style={styles.state}>
            <Text style={styles.stateText} accessibilityLiveRegion="polite">
              {loadErrorMessage(error)}
            </Text>
            <Button label="Reintentar" onPress={retry} />
          </View>
        ) : (
          <Skeleton style={[styles.content, styles.top]}>
            {!covered && (
              <View style={styles.body}>
                <SkeletonHero />
                <SkeletonSummaryPair />
                <SkeletonChart />
              </View>
            )}
          </Skeleton>
        )}
      </ScreenBackground>
    );
  }

  const code = data.currency.code;

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <StickyHeader />
      <RevealScrollView
        contentContainerStyle={[styles.content, styles.top]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              refresh();
              refreshFlow();
            }}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.bgApp}
          />
        }>
        {!covered && (
          <ReplayOnFocus value={HOME_REPLAY}>
            <View style={styles.body}>
              <Reveal index={0}>
                <BalanceCard amount={{ value: data.balance, format: value => formatAmount(value, code) }} />
              </Reveal>
              <Reveal index={1} style={styles.totals}>
                <SummaryCard
                  kind="INCOME"
                  label="Ingresos"
                  amount={{ value: totalOf(data.categories, 'INCOME'), format: value => formatAmount(value, code) }}
                />
                <SummaryCard
                  kind="EXPENSE"
                  label="Gastos"
                  amount={{ value: totalOf(data.categories, 'EXPENSE'), format: value => formatAmount(value, code) }}
                />
              </Reveal>
              <Reveal index={2}>
                <CashFlowChart data={flow ?? undefined} interval={interval} currencyCode={code} onIntervalChange={setInterval} />
              </Reveal>
              <Reveal index={3}>
                <CategoryBreakdown categories={data.categories} currencyCode={code} />
              </Reveal>
            </View>
          </ReplayOnFocus>
        )}
      </RevealScrollView>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 29,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  top: { paddingTop: spacing.sm },
  body: { gap: 19 },
  totals: { flexDirection: 'row', gap: 21 },
  state: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
