import { Image } from 'expo-image';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { AddHeader } from '@/components/add/add-header';
import { DonutChart, LineChart, PairedBars } from '@/components/statistics/charts';
import { Button } from '@/components/ui/button';
import { AmountText, type Amount } from '@/components/ui/count-up';
import { FilterChips } from '@/components/ui/filter-chips';
import { Grow } from '@/components/ui/grow';
import { Reveal } from '@/components/ui/reveal';
import { ScreenBackground } from '@/components/ui/screen-background';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { loadStatistics, type StatisticsData, type StatsPeriod } from '@/features/statistics/statistics-api';
import { useThemeName } from '@/features/theme/theme-store';
import { ApiError } from '@/lib/api';
import { formatAmount, periodLabel, periodTitle, utcDateLabel } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

type Kind = 'EXPENSE' | 'INCOME';

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'WEEK', label: 'Semana' },
  { value: 'MONTH', label: 'Mes' },
  { value: 'YEAR', label: 'Año' },
];

const KINDS: { value: Kind; label: string }[] = [
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
];

const TREND_TITLES: Record<StatsPeriod, string> = {
  WEEK: 'Últimas 6 semanas',
  MONTH: 'Últimos 6 meses',
  YEAR: 'Últimos 5 años',
};

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const GLOWS = [
  { left: '82%', top: '16%' },
  { left: '8%', top: '46%' },
  { left: '86%', top: '74%' },
] as const;

const CALENDAR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M2 12c0-3.771 0-5.657 1.172-6.828S6.229 4 10 4h4c3.771 0 5.657 0 6.828 1.172S22 8.229 22 12v2c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14z"/><path d="M7 4V2.5M17 4V2.5M2.5 9h19M8 14.5h3m-3 3h6"/></g></svg>';

const RECEIPT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M7.245 2h9.51c1.159 0 1.738 0 2.206.163a3.05 3.05 0 0 1 1.881 1.936C21 4.581 21 5.177 21 6.37v14.004c0 .858-.985 1.314-1.608.744a.946.946 0 0 0-1.284 0l-.483.442a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0l-.483-.442a.946.946 0 0 0-1.284 0c-.623.57-1.608.114-1.608-.744V6.37c0-1.193 0-1.79.158-2.27c.3-.913.995-1.629 1.881-1.937C5.507 2 6.086 2 7.245 2Z"/><path d="M10.5 11H17M7 11h.5M7 7.5h.5m-.5 7h.5m3-7H17m-6.5 7H17"/></g></svg>';

const TREND_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M22 7l-7.5 7.5l-4-4L3 18"/><path d="M16 7h6v6"/></g></svg>';

const isColor = (value?: string): value is string => !!value && /^#[0-9a-f]{3,8}$/i.test(value);

function previousLabel(data: StatisticsData, kind: StatsPeriod) {
  if (kind === 'WEEK') return 'la semana anterior';
  if (kind === 'MONTH') return SHORT_MONTHS[data.previous.start.getMonth()];
  return String(data.previous.start.getFullYear());
}

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  return 'El servidor no pudo cargar tus estadísticas. Vuelve a intentarlo en un momento.';
}

type ChangeTone = 'up-good' | 'up-bad';

function ChangeLabel({ change, tone, versus }: { change: number | null; tone: ChangeTone; versus: string }) {
  if (change === null) return <Text style={styles.note}>Sin datos de {versus}</Text>;
  if (change === 0) return <Text style={styles.note}>Igual que {versus}</Text>;
  const good = tone === 'up-good' ? change > 0 : change < 0;
  return (
    <Text style={[styles.note, { color: good ? colors.income : colors.danger }]}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs {versus}
    </Text>
  );
}

type TileProps = { label: string; value: Amount; valueColor?: string; children: ReactNode };

function Tile({ label, value, valueColor, children }: TileProps) {
  return (
    <View style={styles.tile} accessible>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, valueColor ? { color: valueColor } : null]} numberOfLines={1} adjustsFontSizeToFit>
        <AmountText amount={value} />
      </Text>
      {children}
    </View>
  );
}

type CardProps = { title: string; detail?: string; index: number; children: ReactNode };

function Card({ title, detail, index, children }: CardProps) {
  return (
    <Reveal index={index} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        {detail && <Text style={styles.cardDetail}>{detail}</Text>}
      </View>
      {children}
    </Reveal>
  );
}

function Highlight({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <View style={styles.highlight} accessible accessibilityLabel={`${detail}: ${title}`}>
      <View style={styles.highlightIcon}>
        <SvgXml xml={icon} color={colors.textInverse} width={22} height={22} />
      </View>
      <View style={styles.highlightText}>
        <Text style={styles.highlightTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.cardDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

function StatisticsBody({ data, period, kind, onKind }: { data: StatisticsData; period: StatsPeriod; kind: Kind; onKind: (kind: Kind) => void }) {
  const { summary } = data;
  const code = summary.currency.code;
  const versus = previousLabel(data, period);
  const categories = summary.categories.filter(item => item.type === kind);
  const accent = kind === 'INCOME' ? colors.income : colors.expense;
  const categoryTotal = categories.reduce((sum, item) => sum + item.total, 0);
  const colorOf = (color?: string) => (isColor(color) ? color : accent);
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
      <Reveal index={0} style={styles.tiles}>
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
          <Text style={styles.note}>{summary.savingsRate === null ? 'Sin ingresos' : 'de lo que ingresaste'}</Text>
        </Tile>
      </Reveal>

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
          <Text style={styles.evolutionNote}>
            Empezó en <Text style={styles.evolutionStrong}>{formatAmount(firstBalance, code)}</Text> y cerró en{' '}
            <Text style={styles.evolutionStrong}>{formatAmount(lastBalance, code)}</Text>
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

      <Card index={2} title={kind === 'EXPENSE' ? 'Gastos por categoría' : 'Ingresos por categoría'}>
        <SegmentedControl options={KINDS} value={kind} onChange={onKind} activeColor={accent} compact />
        {categories.length === 0 ? (
          <Text style={styles.empty}>
            {kind === 'EXPENSE' ? 'No hay gastos en este periodo' : 'No hay ingresos en este periodo'}
          </Text>
        ) : (
          <>
            <View style={styles.donutRow}>
              <DonutChart segments={categories.map(item => ({ value: item.total, color: colorOf(item.category.color) }))} />
              <View>
                <Text style={styles.cardDetail}>Total</Text>
                <Text style={styles.donutTotal}>{formatAmount(categoryTotal, code)}</Text>
                <Text style={styles.cardDetail}>
                  {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
                </Text>
              </View>
            </View>
            <View style={styles.rows}>
              {categories.map((item, index) => {
                const share = categoryTotal > 0 ? Math.round((item.total / categoryTotal) * 100) : 0;
                return (
                  <Reveal key={`${kind}:${item.category.id}`} index={index}>
                    <View
                      style={styles.categoryRow}
                      accessible
                      accessibilityLabel={`${item.category.name}, ${formatAmount(item.total, code)}, ${share}%`}>
                      <View style={[styles.dot, { backgroundColor: colorOf(item.category.color) }]} />
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {item.category.name}
                      </Text>
                      <Text style={styles.categoryShare}>{share}%</Text>
                      {item.change === null ? (
                        <Text style={styles.note}>nueva</Text>
                      ) : (
                        <ChangeLabel change={item.change} tone={kind === 'EXPENSE' ? 'up-bad' : 'up-good'} versus={versus} />
                      )}
                    </View>
                  </Reveal>
                );
              })}
            </View>
          </>
        )}
      </Card>

      <Card index={3} title="Ingresos vs gastos" detail={TREND_TITLES[period]}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.income }]} />
            <Text style={styles.legendLabel}>Ingresos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.expense }]} />
            <Text style={styles.legendLabel}>Gastos</Text>
          </View>
        </View>
        <PairedBars
          items={data.trend.map(item => ({
            label: periodLabel(item.period, period),
            income: item.income,
            expense: item.expense,
          }))}
        />
      </Card>

      {data.wallets.length > 0 && (
        <Card index={4} title="Saldo por billetera" detail={`Barras en ${code}`}>
          <View style={styles.rows}>
            {data.wallets.map((wallet, index) => (
              <Reveal key={wallet.id} index={index}>
                <View
                  style={styles.walletRow}
                  accessible
                  accessibilityLabel={`${wallet.name}, ${formatAmount(wallet.balance, wallet.currency.code)}${wallet.excluded ? ", excluida del saldo" : ""}`}>
                  <View style={styles.walletLabel}>
                    <Text style={styles.walletName} numberOfLines={1}>
                      {wallet.name}
                    </Text>
                    {wallet.excluded && <Text style={styles.excludedTag}>Excluida</Text>}
                  </View>
                  <View style={[styles.walletTrack, wallet.excluded && styles.walletExcluded]}>
                    <Grow
                      key={wallet.userBalance}
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

      <Reveal index={5}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Destacados
        </Text>
      </Reveal>
      <Reveal index={6} style={styles.rows}>
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
      </Reveal>
    </>
  );
}

export default function StatisticsScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<StatsPeriod>('MONTH');
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState<Kind>('EXPENSE');

  const load = useCallback(() => loadStatistics(period, offset), [period, offset]);
  const { data: loaded, error, retry, refresh, refreshing } = useApiData(load);
  const data = loaded?.key === `${period}:${offset}` ? loaded : null;

  const changePeriod = (next: StatsPeriod) => {
    setPeriod(next);
    setOffset(0);
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
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
        <AddHeader title="Estadística" />
        <FilterChips options={PERIODS} value={period} onChange={changePeriod} />
        <View style={styles.navigator}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Periodo anterior"
            hitSlop={10}
            onPress={() => setOffset(current => current - 1)}
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
            <Image
              contentFit="contain"
              source={require('@/assets/icons/chevron-down.svg')}
              tintColor={colors.brand}
              style={[styles.chevron, styles.left]}
            />
          </Pressable>
          <Text style={styles.periodLabel} accessibilityLiveRegion="polite">
            {data?.range.label ?? ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Periodo siguiente"
            accessibilityState={{ disabled: offset >= 0 }}
            disabled={offset >= 0}
            hitSlop={10}
            onPress={() => setOffset(current => Math.min(0, current + 1))}
            style={({ pressed }) => [styles.arrow, offset >= 0 && styles.off, pressed && styles.pressed]}>
            <Image
              contentFit="contain"
              source={require('@/assets/icons/chevron-down.svg')}
              tintColor={colors.brand}
              style={[styles.chevron, styles.right]}
            />
          </Pressable>
        </View>
        {data ? (
          <StatisticsBody data={data} period={period} kind={kind} onKind={setKind} />
        ) : (
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
        )}
      </RevealScrollView>
    </ScreenBackground>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  navigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  chevron: { width: 11.5, height: 5.5 },
  left: { transform: [{ rotate: '90deg' }] },
  right: { transform: [{ rotate: '-90deg' }] },
  periodLabel: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  tileLabel: { ...typography.labelOverline, color: colors.textSecondary },
  tileValue: { ...typography.titleSection, fontSize: 17, color: colors.textPrimary },
  note: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: { gap: 2 },
  cardTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 16, color: colors.textPrimary },
  cardDetail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  evolutionNote: { ...typography.caption, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  evolutionStrong: { fontFamily: typography.titleSection.fontFamily, color: colors.textPrimary },
  empty: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  donutTotal: { ...typography.titleSection, color: colors.textPrimary },
  rows: { gap: spacing.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  categoryName: { ...typography.bodyMedium, fontSize: 13, flex: 1, color: colors.textPrimary },
  categoryShare: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 13, color: colors.textPrimary },
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { ...typography.labelLegend, color: colors.textSecondary },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  walletLabel: { width: 92 },
  walletName: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  excludedTag: { ...typography.caption, color: colors.expense },
  walletExcluded: { opacity: 0.45 },
  walletTrack: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.segment, overflow: 'hidden' },
  walletBar: { height: '100%', borderRadius: radius.full },
  walletAmount: { ...typography.caption, fontSize: 12, maxWidth: '40%', textAlign: 'right', color: colors.textSecondary },
  sectionTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  highlight: {
    minHeight: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  highlightIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: { flex: 1, gap: 2 },
  highlightTitle: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, color: colors.textPrimary },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
