import { useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { CashFlowPeriod } from '@/features/home/home-api';
import { formatAmount, monthLabel } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/theme';

type Point = { x: number; y: number };

const CHART_HEIGHT = 211;
const TOP = 56;
const BOTTOM = CHART_HEIGHT - 10;
const SIDE = 11;
const TOOLTIP_WIDTH = 150;

const clampY = (y: number) => Math.min(Math.max(y, TOP), BOTTOM);

function smoothPath(points: Point[]) {
  if (points.length === 0) return '';
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: clampY(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: clampY(p2.y - (p3.y - p1.y) / 6) };
    path += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return path;
}

function areaPath(points: Point[]) {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points)} L${last.x},${CHART_HEIGHT} L${first.x},${CHART_HEIGHT} Z`;
}

type CashFlowChartProps = { periods: CashFlowPeriod[]; currencyCode: string };

export function CashFlowChart({ periods, currencyCode }: CashFlowChartProps) {
  const id = useId();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? periods.length - 1;

  const max = Math.max(1, ...periods.flatMap(period => [period.income, period.expense]));
  const step = periods.length > 1 ? (width - SIDE * 2) / (periods.length - 1) : 0;
  const xAt = (index: number) => (periods.length > 1 ? SIDE + index * step : width / 2);
  const yAt = (value: number) => BOTTOM - (value / max) * (BOTTOM - TOP);
  const income = periods.map((period, index) => ({ x: xAt(index), y: yAt(period.income) }));
  const expense = periods.map((period, index) => ({ x: xAt(index), y: yAt(period.expense) }));

  const current = periods[selected];
  const markerX = xAt(selected);
  const tooltipTop = current ? Math.max(0, Math.min(yAt(current.income), yAt(current.expense)) - 56) : 0;
  const tooltipLeft = Math.min(Math.max(markerX - TOOLTIP_WIDTH / 2, 0), Math.max(width - TOOLTIP_WIDTH, 0));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Flujo Financiero</Text>
      <View style={styles.legend}>
        <LegendItem color={colors.income} label="Ingresos" />
        <LegendItem color={colors.expense} label="Gastos" />
      </View>
      <View style={styles.chart} onLayout={onLayout}>
        {width > 0 && periods.length > 0 && (
          <>
            <Svg width={width} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id={`${id}-income`} x1={0} y1={0} x2={0} y2={1}>
                  <Stop offset={0} stopColor={colors.income} stopOpacity={0.25} />
                  <Stop offset={1} stopColor={colors.income} stopOpacity={0} />
                </LinearGradient>
                <LinearGradient id={`${id}-expense`} x1={0} y1={0} x2={0} y2={1}>
                  <Stop offset={0} stopColor={colors.expense} stopOpacity={0.35} />
                  <Stop offset={1} stopColor={colors.expense} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={areaPath(expense)} fill={`url(#${id}-expense)`} />
              <Path d={areaPath(income)} fill={`url(#${id}-income)`} />
              <Path d={smoothPath(expense)} stroke={colors.expense} strokeWidth={3} fill="none" />
              <Path d={smoothPath(income)} stroke={colors.income} strokeWidth={3} fill="none" />
              <Line
                x1={markerX}
                x2={markerX}
                y1={Math.min(income[selected].y, expense[selected].y)}
                y2={CHART_HEIGHT}
                stroke={colors.textMuted}
                strokeDasharray="4 4"
              />
              <Marker point={expense[selected]} color={colors.expense} />
              <Marker point={income[selected]} color={colors.income} />
            </Svg>
            {current && (
              <View style={[styles.tooltip, { top: tooltipTop, left: tooltipLeft }]} pointerEvents="none">
                <TooltipRow label="Ingreso:" value={formatAmount(current.income, currencyCode, '', true)} accent />
                <TooltipRow label="Gasto:" value={formatAmount(current.expense, currencyCode, '', true)} />
              </View>
            )}
            <View style={StyleSheet.absoluteFill}>
              <View style={styles.hitRow}>
                {periods.map((period, index) => (
                  <Pressable
                    key={period.period}
                    style={styles.hit}
                    accessibilityRole="button"
                    accessibilityLabel={`${monthLabel(period.period)}: ingresos ${formatAmount(period.income, currencyCode)}, gastos ${formatAmount(period.expense, currencyCode)}`}
                    onPress={() => setPicked(index)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </View>
      <View style={styles.axis}>
        {width > 0 &&
          periods.map((period, index) => (
            <Text
              key={period.period}
              style={[styles.axisLabel, { left: Math.min(Math.max(xAt(index) - 16, 0), width - 32) }]}>
              {monthLabel(period.period)}
            </Text>
          ))}
      </View>
    </View>
  );
}

function Marker({ point, color }: { point: Point; color: string }) {
  return <Circle cx={point.x} cy={point.y} r={8} fill={colors.bgApp} stroke={color} strokeWidth={3} />;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function TooltipRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.tooltipRow}>
      <Text style={[styles.tooltipText, { color: accent ? colors.textAccent : colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.tooltipText, { color: accent ? colors.avatar : colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 21,
  },
  title: { ...typography.titleSection, color: colors.textPrimary },
  legend: { flexDirection: 'row', gap: spacing.lg, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { ...typography.labelLegend, color: colors.textSecondary },
  chart: { height: CHART_HEIGHT, marginTop: 4, marginHorizontal: 5 },
  hitRow: { flex: 1, flexDirection: 'row' },
  hit: { flex: 1 },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    gap: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.tooltip,
    boxShadow: '0px 6px 20px 0px rgba(8, 13, 29, 0.8)',
  },
  tooltipRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tooltipText: typography.labelLegend,
  axis: { height: 14, marginTop: 13, marginHorizontal: 5 },
  axisLabel: { ...typography.labelAxis, position: 'absolute', width: 32, textAlign: 'center', color: colors.textMuted },
});
