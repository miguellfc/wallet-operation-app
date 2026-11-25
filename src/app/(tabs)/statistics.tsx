import { useCallback, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';

import { StickyHeader } from '@/components/home/sticky-header';
import { LineChart } from '@/components/statistics/charts';
import {
  CALENDAR_ICON,
  Card,
  CategoryCard,
  ChangeLabel,
  FlowCard,
  Highlight,
  HighlightList,
  isColor,
  Note,
  PeriodNavigator,
  RECEIPT_ICON,
  SectionTitle,
  statStyles,
  Tile,
  TileGrid,
  TREND_ICON,
  versusLabel,
  type StatsKind,
} from '@/components/statistics/stat-blocks';
import { Button } from '@/components/ui/button';
import { Grow } from '@/components/ui/grow';
import { Reveal } from '@/components/ui/reveal';
import { ScreenBackground } from '@/components/ui/screen-background';
import { Skeleton, SkeletonChart, SkeletonHero, SkeletonRows, SkeletonSummaryPair } from '@/components/ui/skeleton';
import { PeriodSwipe } from '@/components/statistics/period-swipe';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { loadStatistics, periodRange, type StatisticsData, type StatsPeriod } from '@/features/statistics/statistics-api';
import { useThemeName } from '@/features/theme/theme-store';
import { ApiError } from '@/lib/api';
import { formatAmount, periodLabel, periodTitle, utcDateLabel } from '@/lib/format';
import { ReplayOnFocus, valuesKey } from '@/lib/motion';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

const TREND_TITLES: Record<StatsPeriod, string> = {
  WEEK: 'Últimas 6 semanas',
  MONTH: 'Últimos 6 meses',
  YEAR: 'Últimos 5 años',
};

const STATS_REPLAY = { counts: false, charts: false };

const MAX_PERIODS = 6;

const GLOWS = [
  { left: '82%', top: '16%' },
  { left: '8%', top: '46%' },
  { left: '86%', top: '74%' },
] as const;

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus estadísticas. Vuelve a intentarlo en un momento.';
}

type BodyProps = { data: StatisticsData; period: StatsPeriod; kind: StatsKind; onKind: (kind: StatsKind) => void };

function StatisticsBody({ data, period, kind, onKind }: BodyProps) {
  const { summary } = data;
  const code = summary.currency.code;
  const versus = versusLabel(period, data.previous);
  const maxWallet = Math.max(0, ...data.wallets.map(wallet => wallet.userBalance));
  const evolutionLabels = data.evolution.map(point =>
    data.evolutionInterval === 'MONTH' ? periodLabel(point.period, 'MONTH') : String(new Date(point.period).getUTCDate()),
  );
  const evolutionTitles = data.evolution.map(point =>
    data.evolutionInterval === 'MONTH' ? periodTitle(point.period, 'MONTH') : utcDateLabel(point.period),
  );
  const firstBalance = data.evolution[0]?.balance;
  const lastBalance = data.evolution[data.evolution.length - 1]?.balance;
  const biggest = summary.biggestExpense;
  const top = summary.topIncrease;

  return (
    <>
      <TileGrid index={0}>
        <Tile
          label="Ingresos"
          value={{ value: summary.current.income, format: value => formatAmount(value, code) }}
          valueColor={colors.income}>
          <ChangeLabel change={summary.changes.income} tone="up-good" versus={versus} />
        </Tile>
        <Tile
          label="Gastos"
          value={{ value: summary.current.expense, format: value => formatAmount(value, code) }}
          valueColor={colors.expense}>
          <ChangeLabel change={summary.changes.expense} tone="up-bad" versus={versus} />
        </Tile>
        <Tile label="Ahorro neto" value={{ value: summary.current.net, format: value => formatAmount(value, code) }}>
          <ChangeLabel change={summary.changes.net} tone="up-good" versus={versus} />
        </Tile>
        <Tile label="Tasa de ahorro" value={summary.savingsRate === null ? '—' : `${summary.savingsRate}%`}>
          <Note>{summary.savingsRate === null ? 'Sin ingresos' : 'de lo que ingresaste'}</Note>
        </Tile>
      </TileGrid>

      <Card
        index={1}
        title="Evolución del saldo"
        detail={`Tu saldo total al cierre de cada ${data.evolutionInterval === 'MONTH' ? 'mes' : 'día'}`}>
        <LineChart
          values={data.evolution.map(point => point.balance)}
          labels={evolutionLabels}
          titles={evolutionTitles}
          color={colors.brand}
          format={value => formatAmount(value, code, '', true)}
        />
        {firstBalance !== undefined && lastBalance !== undefined && (
          <Text style={statStyles.evolutionNote}>
            Empezó en <Text style={statStyles.evolutionStrong}>{formatAmount(firstBalance, code)}</Text> y cerró en{' '}
            <Text style={statStyles.evolutionStrong}>{formatAmount(lastBalance, code)}</Text>
            {lastBalance !== firstBalance && (
              <Text style={{ color: lastBalance > firstBalance ? colors.income : colors.danger }}>
                {' '}
                ({lastBalance > firstBalance ? '+' : '−'}
                {formatAmount(Math.abs(lastBalance - firstBalance), code)})
              </Text>
            )}
            . Toca la gráfica para ver cada {data.evolutionInterval === 'MONTH' ? 'mes' : 'día'}.
          </Text>
        )}
      </Card>

      <CategoryCard index={2} kind={kind} onKind={onKind} categories={summary.categories} code={code} versus={versus} />

      <FlowCard
        index={3}
        title="Ingresos vs gastos"
        detail={TREND_TITLES[period]}
        labels={['Ingresos', 'Gastos']}
        items={data.trend.map(item => ({
          label: periodLabel(item.period, period),
          income: item.income,
          expense: item.expense,
        }))}
      />

      {data.wallets.length > 0 && (
        <Card index={4} title="Saldo por billetera" detail={`Barras en ${code}`}>
          <View style={statStyles.rows}>
            {data.wallets.map((wallet, index) => (
              <Reveal key={wallet.id} index={index}>
                <View
                  style={styles.walletRow}
                  accessible
                  accessibilityLabel={`${wallet.name}, ${formatAmount(wallet.balance, wallet.currency.code)}${wallet.excluded ? ', excluida del saldo' : ''}`}>
                  <View style={styles.walletLabel}>
                    <Text style={styles.walletName} numberOfLines={1}>
                      {wallet.name}
                    </Text>
                    {wallet.excluded && <Text style={styles.excludedTag}>Excluida</Text>}
                  </View>
                  <View style={[styles.walletTrack, wallet.excluded && styles.walletExcluded]}>
                    <Grow
                      key={valuesKey([wallet.userBalance])}
                      axis="x"
                      style={[
                        styles.walletBar,
                        {
                          width: `${maxWallet > 0 ? Math.max(0, (wallet.userBalance / maxWallet) * 100) : 0}%`,
                          backgroundColor: isColor(wallet.color) ? wallet.color : colors.brand,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {formatAmount(wallet.balance, wallet.currency.code)}
                  </Text>
                </View>
              </Reveal>
            ))}
          </View>
        </Card>
      )}

      <SectionTitle index={5}>Destacados</SectionTitle>
      <HighlightList index={6}>
        <Highlight icon={CALENDAR_ICON} title={`${formatAmount(summary.dailyAverage, code)} / día`} detail="Gasto medio diario" />
        {biggest && (
          <Highlight
            icon={RECEIPT_ICON}
            title={`${formatAmount(biggest.amount, code)} · ${biggest.category.name}`}
            detail={`Mayor gasto · ${utcDateLabel(biggest.date)}`}
          />
        )}
        {top && (
          <Highlight
            icon={TREND_ICON}
            title={top.change === null ? `${top.category.name} · nueva` : `${top.category.name} +${top.change}%`}
            detail="La categoría de gasto que más subió"
          />
        )}
      </HighlightList>
    </>
  );
}

export default function StatisticsScreen() {
  useThemeName();
  const [period, setPeriod] = useState<StatsPeriod>('MONTH');
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState<StatsKind>('EXPENSE');

  const load = useCallback(() => loadStatistics(period, offset), [period, offset]);
  const { data: loaded, error, retry, refresh, refreshing } = useApiData(load);
  const key = `${period}:${offset}`;
  const [visited, setVisited] = useState<StatisticsData[]>([]);
  const [shown, setShown] = useState<string | null>(null);

  if (loaded && !visited.includes(loaded)) {
    const known = visited.some(item => item.key === loaded.key);
    setVisited(
      known
        ? visited.map(item => (item.key === loaded.key ? loaded : item))
        : [...visited, loaded].slice(-MAX_PERIODS),
    );
  }
  const current = visited.find(item => item.key === key);
  if (current && shown !== key) setShown(key);
  const visible = current ? key : error ? null : shown;

  const changePeriod = (next: StatsPeriod) => {
    setPeriod(next);
    setOffset(0);
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <StickyHeader />
      <RevealScrollView
        contentContainerStyle={[styles.content, styles.contentTop]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.bgApp}
          />
        }>
        <Text style={styles.title} accessibilityRole="header">
          Estadística
        </Text>
        <PeriodNavigator
          period={period}
          label={periodRange(period, offset).label}
          canNext={offset < 0}
          onPeriod={changePeriod}
          onPrevious={() => setOffset(current => current - 1)}
          onNext={() => setOffset(current => Math.min(0, current + 1))}
        />
        <PeriodSwipe period={period} onPeriod={changePeriod}>
          <ReplayOnFocus value={STATS_REPLAY}>
            {visited.map(item => (
              <View
                key={item.key}
                style={item.key === visible ? styles.body : styles.hidden}
                pointerEvents={item.key === visible ? 'auto' : 'none'}
                accessibilityElementsHidden={item.key !== visible}
                importantForAccessibility={item.key === visible ? 'auto' : 'no-hide-descendants'}>
                <StatisticsBody
                  data={item}
                  period={item.key.split(':')[0] as StatsPeriod}
                  kind={kind}
                  onKind={setKind}
                />
              </View>
            ))}
          </ReplayOnFocus>
          {!visible &&
            (error ? (
              <View style={styles.state}>
                <Text style={styles.stateText} accessibilityLiveRegion="polite">
                  {loadErrorMessage(error)}
                </Text>
                <Button label="Reintentar" onPress={retry} />
              </View>
            ) : (
              <Skeleton style={styles.body}>
                <SkeletonHero />
                <SkeletonSummaryPair />
                <SkeletonChart chips={false} />
                <SkeletonRows count={3} title />
              </Skeleton>
            ))}
        </PeriodSwipe>
      </RevealScrollView>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  contentTop: { paddingTop: spacing.sm },
  title: { ...typography.titleSection, color: colors.textPrimary },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walletLabel: { width: 92 },
  walletName: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  excludedTag: { ...typography.caption, color: colors.expense },
  walletExcluded: { opacity: 0.45 },
  walletTrack: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.segment, overflow: 'hidden' },
  walletBar: { height: '100%', borderRadius: radius.full },
  walletAmount: { ...typography.caption, fontSize: 12, maxWidth: '40%', textAlign: 'right', color: colors.textSecondary },
  body: { gap: 15 },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, gap: 15, opacity: 0 },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
