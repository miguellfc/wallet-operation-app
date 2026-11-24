import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/settings/back-header';
import { LineChart } from '@/components/statistics/charts';
import {
  CALENDAR_ICON,
  Card,
  CategoryCard,
  ChangeLabel,
  FlowCard,
  Highlight,
  HighlightList,
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
import { AmountText } from '@/components/ui/count-up';
import { Grow } from '@/components/ui/grow';
import { Reveal } from '@/components/ui/reveal';
import { ScreenBackground } from '@/components/ui/screen-background';
import { RevealScrollView } from '@/components/ui/scroll-reveal';
import { WalletIcon } from '@/components/wallets/wallet-icon';
import type { StatsPeriod } from '@/features/statistics/statistics-api';
import { useThemeName } from '@/features/theme/theme-store';
import { loadWalletStatistics, type TransferTotal, type WalletStatistics } from '@/features/wallets/wallet-statistics-api';
import { ApiError } from '@/lib/api';
import { onColor } from '@/lib/color';
import { formatAmount, formatNumber, periodLabel, periodTitle, utcDateLabel } from '@/lib/format';
import { useApiData } from '@/lib/use-api-data';
import { colors, fonts, layout, radius, spacing, themedStyles, typography } from '@/theme';

const GLOWS = [
  { left: '20%', top: '14%' },
  { left: '80%', top: '34%' },
  { left: '24%', top: '70%' },
] as const;

const FLOW_DETAIL: Record<StatsPeriod, string> = {
  WEEK: 'Por día de la semana',
  MONTH: 'Por semana del mes',
  YEAR: 'Por mes del año',
};

const isHex = (value: string) => /^#[0-9a-f]{3,8}$/i.test(value);

const countLabel = (count: number) => `${count} ${count === 1 ? 'movimiento' : 'movimientos'}`;

function loadErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';
  if (error.status === 404) return 'Esta billetera ya no existe.';
  return 'El servidor no pudo cargar las estadísticas de esta billetera. Vuelve a intentarlo en un momento.';
}

function TransferRow({ item, incoming, code }: { item: TransferTotal; incoming: boolean; code: string }) {
  const amount = `${incoming ? '+' : '−'}${formatAmount(item.amount, code)}`;
  return (
    <View
      style={styles.transferRow}
      accessible
      accessibilityLabel={`${incoming ? 'Desde' : 'Hacia'} ${item.wallet}, ${amount}, ${countLabel(item.count)}`}>
      <View style={[styles.transferBadge, { backgroundColor: incoming ? colors.incomeSoft : colors.expenseSoft }]}>
        <Image
          contentFit="contain"
          source={require('@/assets/icons/arrow-down.svg')}
          tintColor={colors.iconAccent}
          style={[styles.transferArrow, !incoming && styles.transferArrowUp]}
        />
      </View>
      <View style={styles.transferText}>
        <Text style={styles.transferName} numberOfLines={1}>
          {incoming ? 'Desde' : 'Hacia'} {item.wallet}
        </Text>
        <Text style={statStyles.cardDetail}>{countLabel(item.count)}</Text>
      </View>
      <Text style={[styles.transferAmount, { color: incoming ? colors.income : colors.expense }]} numberOfLines={1}>
        {amount}
      </Text>
    </View>
  );
}

type BodyProps = { data: WalletStatistics; period: StatsPeriod; kind: StatsKind; onKind: (kind: StatsKind) => void };

function WalletStatisticsBody({ data, period, kind, onKind }: BodyProps) {
  const { wallet, current } = data;
  const code = wallet.currency.code;
  const color = isHex(wallet.color) ? wallet.color : colors.brand;
  const versus = versusLabel(period, data.previous);
  const difference = data.closingBalance - data.previousClosing;
  const net = current.income - current.expense;
  const evolutionLabels = data.evolution.map(point =>
    data.evolutionInterval === 'MONTH' ? periodLabel(point.period, 'MONTH') : String(new Date(point.period).getUTCDate()),
  );
  const evolutionTitles = data.evolution.map(point =>
    data.evolutionInterval === 'MONTH' ? periodTitle(point.period, 'MONTH') : utcDateLabel(point.period),
  );
  const transfers = [
    ...data.transfers.incoming.map(item => ({ item, incoming: true })),
    ...data.transfers.outgoing.map(item => ({ item, incoming: false })),
  ];
  const biggest = data.biggestExpense;
  const busiest = data.busiestDay;

  return (
    <>
      <Reveal index={0} style={styles.hero}>
        <View style={styles.badge} importantForAccessibility="no-hide-descendants">
          <Grow key={wallet._id} axis="pop" delay={180} style={StyleSheet.absoluteFill}>
            <View style={[styles.badgeRing, { borderColor: color }]} />
            <View style={[styles.badgeCircle, { backgroundColor: color }]}>
              <WalletIcon name={wallet.icon} color={onColor(color)} size={26} />
            </View>
          </Grow>
        </View>
        <Text style={styles.overline}>Saldo al cierre · {wallet.name}</Text>
        <View style={styles.amountRow} accessible accessibilityLabel={`Saldo al cierre ${formatAmount(data.closingBalance, code)}`}>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            <AmountText amount={{ value: data.closingBalance, format: value => formatNumber(value) }} />
          </Text>
          <Text style={styles.code}>{code}</Text>
        </View>
        <Text style={[styles.difference, { color: difference === 0 ? colors.textMuted : difference > 0 ? colors.income : colors.danger }]}>
          {difference === 0
            ? `Sin cambios vs ${versus}`
            : `${difference > 0 ? '▲ +' : '▼ −'}${formatAmount(Math.abs(difference), code)} vs ${versus}`}
        </Text>
      </Reveal>

      <TileGrid index={1}>
        <Tile
          label="Entradas"
          value={{ value: current.income, format: value => formatAmount(value, code) }}
          valueColor={colors.income}>
          <Note>{countLabel(current.incomeCount)}</Note>
          <ChangeLabel change={data.changes.income} tone="up-good" versus={versus} />
        </Tile>
        <Tile
          label="Salidas"
          value={{ value: current.expense, format: value => formatAmount(value, code) }}
          valueColor={colors.expense}>
          <Note>{countLabel(current.expenseCount)}</Note>
          <ChangeLabel change={data.changes.expense} tone="up-bad" versus={versus} />
        </Tile>
        <Tile label="Ahorro neto" value={{ value: net, format: value => formatAmount(value, code) }}>
          <Note>entradas menos salidas</Note>
        </Tile>
        <Tile label="Tasa de ahorro" value={data.savingsRate === null ? '—' : `${data.savingsRate}%`}>
          <Note>{data.savingsRate === null ? 'Sin entradas' : 'de lo que entró'}</Note>
        </Tile>
      </TileGrid>

      <Card
        index={2}
        title="Evolución del saldo"
        detail={`Saldo de ${wallet.name} al cierre de cada ${data.evolutionInterval === 'MONTH' ? 'mes' : 'día'}`}>
        <LineChart
          values={data.evolution.map(point => point.balance)}
          labels={evolutionLabels}
          titles={evolutionTitles}
          color={color}
          format={value => formatAmount(value, code, '', true)}
        />
        <Text style={statStyles.evolutionNote}>
          Empezó en <Text style={statStyles.evolutionStrong}>{formatAmount(data.previousClosing, code)}</Text> y cerró en{' '}
          <Text style={statStyles.evolutionStrong}>{formatAmount(data.closingBalance, code)}</Text>. Toca la gráfica para
          ver cada {data.evolutionInterval === 'MONTH' ? 'mes' : 'día'}.
        </Text>
      </Card>

      <FlowCard index={3} title="Entradas vs salidas" detail={FLOW_DETAIL[period]} labels={['Entradas', 'Salidas']} items={data.flow} />

      <CategoryCard index={4} kind={kind} onKind={onKind} categories={data.categories} code={code} versus={versus} />

      {transfers.length > 0 && (
        <Card index={5} title="Transferencias" detail="Dinero que se movió con otras billeteras">
          <View style={statStyles.rows}>
            {transfers.map(({ item, incoming }, index) => (
              <Reveal key={`${incoming ? 'in' : 'out'}:${item.wallet}`} index={index}>
                <TransferRow item={item} incoming={incoming} code={code} />
              </Reveal>
            ))}
          </View>
        </Card>
      )}

      <SectionTitle index={6}>Destacados</SectionTitle>
      <HighlightList index={7}>
        <Highlight icon={CALENDAR_ICON} title={`${formatAmount(data.dailyAverage, code)} / día`} detail="Gasto medio diario" />
        {biggest && (
          <Highlight
            icon={RECEIPT_ICON}
            title={`${formatAmount(biggest.amount, code)} · ${biggest.category.name}`}
            detail={`Mayor gasto · ${utcDateLabel(biggest.date)}`}
          />
        )}
        {busiest && (
          <Highlight
            icon={TREND_ICON}
            title={`${utcDateLabel(busiest.date)} · ${formatAmount(busiest.amount, code)}`}
            detail="El día que más salió dinero"
          />
        )}
      </HighlightList>
    </>
  );
}

export default function WalletStatisticsScreen() {
  useThemeName();
  const insets = useSafeAreaInsets();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [period, setPeriod] = useState<StatsPeriod>('MONTH');
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState<StatsKind>('EXPENSE');

  const load = useCallback(() => loadWalletStatistics(id, period, offset), [id, period, offset]);
  const { data: loaded, error, retry } = useApiData(load);
  const data = loaded?.key === `${id}:${period}:${offset}` ? loaded : null;

  const changePeriod = (next: StatsPeriod) => {
    setPeriod(next);
    setOffset(0);
  };

  return (
    <ScreenBackground glows={[...GLOWS]}>
      <RevealScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + spacing.xxl }]}>
        <BackHeader title="Estadísticas" />
        <PeriodNavigator
          period={period}
          label={data?.range.label ?? ''}
          canNext={offset < 0}
          onPeriod={changePeriod}
          onPrevious={() => setOffset(current => current - 1)}
          onNext={() => setOffset(current => Math.min(0, current + 1))}
        />
        {data ? (
          <WalletStatisticsBody data={data} period={period} kind={kind} onKind={setKind} />
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
    gap: 15,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    minHeight: 161,
    borderRadius: 32,
    backgroundColor: colors.heroCard,
    paddingHorizontal: 23,
    paddingTop: 70,
    paddingBottom: 21,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    gap: 2,
  },
  badge: { position: 'absolute', top: 19, right: 21, width: 78, height: 50 },
  badgeCircle: {
    position: 'absolute',
    left: 0,
    width: 50,
    height: 50,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRing: { position: 'absolute', right: 0, width: 50, height: 50, borderRadius: radius.full, borderWidth: 9 },
  overline: { ...typography.labelOverline, color: colors.textSecondary },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: 4 },
  amount: { ...typography.displayAmount, color: colors.textPrimary, flexShrink: 1 },
  code: { fontFamily: fonts.light, fontSize: 14, color: colors.textPrimary },
  difference: { ...typography.caption, fontSize: 12, marginTop: 2 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  transferBadge: { width: 33, height: 33, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  transferArrow: { width: 10, height: 10 },
  transferArrowUp: { transform: [{ rotate: '180deg' }] },
  transferText: { flex: 1, gap: 2 },
  transferName: { ...typography.bodyMedium, fontSize: 13, color: colors.textPrimary },
  transferAmount: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, fontSize: 13, maxWidth: '45%' },
  state: { paddingVertical: spacing.xxl, justifyContent: 'center', gap: spacing.lg },
  stateText: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center' },
}));
