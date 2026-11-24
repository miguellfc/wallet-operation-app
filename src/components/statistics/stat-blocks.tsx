import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { DonutChart, PairedBars } from '@/components/statistics/charts';
import { AmountText, type Amount } from '@/components/ui/count-up';
import { FilterChips } from '@/components/ui/filter-chips';
import { Reveal } from '@/components/ui/reveal';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { CategoryComparison, PeriodRange, StatsPeriod } from '@/features/statistics/statistics-api';
import { formatAmount } from '@/lib/format';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

export type StatsKind = 'EXPENSE' | 'INCOME';

export const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'WEEK', label: 'Semana' },
  { value: 'MONTH', label: 'Mes' },
  { value: 'YEAR', label: 'Año' },
];

const KINDS: { value: StatsKind; label: string }[] = [
  { value: 'EXPENSE', label: 'Gastos' },
  { value: 'INCOME', label: 'Ingresos' },
];

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const CALENDAR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M2 12c0-3.771 0-5.657 1.172-6.828S6.229 4 10 4h4c3.771 0 5.657 0 6.828 1.172S22 8.229 22 12v2c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14z"/><path d="M7 4V2.5M17 4V2.5M2.5 9h19M8 14.5h3m-3 3h6"/></g></svg>';

export const RECEIPT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M7.245 2h9.51c1.159 0 1.738 0 2.206.163a3.05 3.05 0 0 1 1.881 1.936C21 4.581 21 5.177 21 6.37v14.004c0 .858-.985 1.314-1.608.744a.946.946 0 0 0-1.284 0l-.483.442a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0a1.657 1.657 0 0 0-2.25 0a1.657 1.657 0 0 1-2.25 0l-.483-.442a.946.946 0 0 0-1.284 0c-.623.57-1.608.114-1.608-.744V6.37c0-1.193 0-1.79.158-2.27c.3-.913.995-1.629 1.881-1.937C5.507 2 6.086 2 7.245 2Z"/><path d="M10.5 11H17M7 11h.5M7 7.5h.5m-.5 7h.5m3-7H17m-6.5 7H17"/></g></svg>';

export const TREND_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M22 7l-7.5 7.5l-4-4L3 18"/><path d="M16 7h6v6"/></g></svg>';

export const isColor = (value?: string): value is string => !!value && /^#[0-9a-f]{3,8}$/i.test(value);

export function versusLabel(kind: StatsPeriod, previous: PeriodRange) {
  if (kind === 'WEEK') return 'la semana anterior';
  if (kind === 'MONTH') return SHORT_MONTHS[previous.start.getMonth()];
  return String(previous.start.getFullYear());
}

type ChangeTone = 'up-good' | 'up-bad';

export function ChangeLabel({ change, tone, versus }: { change: number | null; tone: ChangeTone; versus: string }) {
  if (change === null) return <Text style={styles.note}>Sin datos de {versus}</Text>;
  if (change === 0) return <Text style={styles.note}>Igual que {versus}</Text>;
  const good = tone === 'up-good' ? change > 0 : change < 0;
  return (
    <Text style={[styles.note, { color: good ? colors.income : colors.danger }]}>
      {change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs {versus}
    </Text>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

export function TileGrid({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Reveal index={index} style={styles.tiles}>
      {children}
    </Reveal>
  );
}

type TileProps = { label: string; value: Amount; valueColor?: string; children: ReactNode };

export function Tile({ label, value, valueColor, children }: TileProps) {
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

export function Card({ title, detail, index, children }: CardProps) {
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

export function SectionTitle({ index, children }: { index: number; children: string }) {
  return (
    <Reveal index={index}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {children}
      </Text>
    </Reveal>
  );
}

export function Highlight({ icon, title, detail }: { icon: string; title: string; detail: string }) {
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

export function HighlightList({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Reveal index={index} style={styles.rows}>
      {children}
    </Reveal>
  );
}

type PeriodNavigatorProps = {
  period: StatsPeriod;
  label: string;
  canNext: boolean;
  onPeriod: (period: StatsPeriod) => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function PeriodNavigator({ period, label, canNext, onPeriod, onPrevious, onNext }: PeriodNavigatorProps) {
  return (
    <>
      <FilterChips options={PERIODS} value={period} onChange={onPeriod} />
      <View style={styles.navigator}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Periodo anterior"
          hitSlop={10}
          onPress={onPrevious}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <Image
            contentFit="contain"
            source={require('@/assets/icons/chevron-down.svg')}
            tintColor={colors.brand}
            style={[styles.chevron, styles.left]}
          />
        </Pressable>
        <Text style={styles.periodLabel} accessibilityLiveRegion="polite">
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Periodo siguiente"
          accessibilityState={{ disabled: !canNext }}
          disabled={!canNext}
          hitSlop={10}
          onPress={onNext}
          style={({ pressed }) => [styles.arrow, !canNext && styles.off, pressed && styles.pressed]}>
          <Image
            contentFit="contain"
            source={require('@/assets/icons/chevron-down.svg')}
            tintColor={colors.brand}
            style={[styles.chevron, styles.right]}
          />
        </Pressable>
      </View>
    </>
  );
}

type CategoryCardProps = {
  index: number;
  kind: StatsKind;
  onKind: (kind: StatsKind) => void;
  categories: CategoryComparison[];
  code: string;
  versus: string;
};

export function CategoryCard({ index, kind, onKind, categories, code, versus }: CategoryCardProps) {
  const rows = categories.filter(item => item.type === kind);
  const accent = kind === 'INCOME' ? colors.income : colors.expense;
  const total = rows.reduce((sum, item) => sum + item.total, 0);
  const colorOf = (color?: string) => (isColor(color) ? color : accent);

  return (
    <Card index={index} title={kind === 'EXPENSE' ? 'Gastos por categoría' : 'Ingresos por categoría'}>
      <SegmentedControl options={KINDS} value={kind} onChange={onKind} activeColor={accent} compact />
      {rows.length === 0 ? (
        <Text style={styles.empty}>{kind === 'EXPENSE' ? 'No hay gastos en este periodo' : 'No hay ingresos en este periodo'}</Text>
      ) : (
        <>
          <View style={styles.donutRow}>
            <DonutChart segments={rows.map(item => ({ value: item.total, color: colorOf(item.category.color) }))} />
            <View>
              <Text style={styles.cardDetail}>Total</Text>
              <Text style={styles.donutTotal}>{formatAmount(total, code)}</Text>
              <Text style={styles.cardDetail}>
                {rows.length} {rows.length === 1 ? 'categoría' : 'categorías'}
              </Text>
            </View>
          </View>
          <View style={styles.rows}>
            {rows.map((item, row) => {
              const share = total > 0 ? Math.round((item.total / total) * 100) : 0;
              return (
                <Reveal key={`${kind}:${item.category.id}`} index={row}>
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
  );
}

type FlowCardProps = {
  index: number;
  title: string;
  detail?: string;
  labels: [string, string];
  items: { label: string; income: number; expense: number }[];
};

export function FlowCard({ index, title, detail, labels, items }: FlowCardProps) {
  return (
    <Card index={index} title={title} detail={detail}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.income }]} />
          <Text style={styles.legendLabel}>{labels[0]}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.expense }]} />
          <Text style={styles.legendLabel}>{labels[1]}</Text>
        </View>
      </View>
      <PairedBars items={items} />
    </Card>
  );
}

export const statStyles = themedStyles(() => ({
  rows: { gap: spacing.sm },
  cardDetail: { ...typography.caption, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  evolutionNote: { ...typography.caption, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  evolutionStrong: { fontFamily: typography.titleSection.fontFamily, color: colors.textPrimary },
}));

const styles = themedStyles(() => ({
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
}));
