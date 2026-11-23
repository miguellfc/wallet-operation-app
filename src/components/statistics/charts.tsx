import { useId, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, themedStyles, typography } from '@/theme';

const LINE_HEIGHT = 150;
const LINE_TOP = 18;
const LINE_BOTTOM = LINE_HEIGHT - 8;
const SIDE = 8;
const TOOLTIP_WIDTH = 150;

type LineChartProps = {
  values: number[];
  labels: string[];
  titles: string[];
  color: string;
  format: (value: number) => string;
};

export function LineChart({ values, labels, titles, color, format }: LineChartProps) {
  const id = useId();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && picked < values.length ? picked : values.length - 1;
  const low = Math.min(...values, 0);
  const high = Math.max(...values, 0);
  const span = high - low || 1;
  const step = values.length > 1 ? (width - SIDE * 2) / (values.length - 1) : 0;
  const yAt = (value: number) => LINE_BOTTOM - ((value - low) / span) * (LINE_BOTTOM - LINE_TOP);
  const points = values.map((value, index) => ({
    x: values.length > 1 ? SIDE + index * step : width / 2,
    y: yAt(value),
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const area = last ? `${line} L${last.x},${LINE_BOTTOM} L${first.x},${LINE_BOTTOM} Z` : '';
  const guides = [high, (high + low) / 2, low];
  const marker = points[selected];
  const tooltipLeft = marker
    ? Math.min(Math.max(marker.x - TOOLTIP_WIDTH / 2, 0), Math.max(width - TOOLTIP_WIDTH, 0))
    : 0;
  const shown = labels.length <= 6 ? labels : labels.filter((_, index) => index % Math.ceil(labels.length / 5) === 0);

  return (
    <View>
      <View style={styles.line} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && marker && (
          <>
            <Svg width={width} height={LINE_HEIGHT}>
              <Defs>
                <LinearGradient id={`${id}-area`} x1={0} y1={0} x2={0} y2={1}>
                  <Stop offset={0} stopColor={color} stopOpacity={0.3} />
                  <Stop offset={1} stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {guides.map((value, index) => (
                <Line
                  key={index}
                  x1={0}
                  x2={width}
                  y1={yAt(value)}
                  y2={yAt(value)}
                  stroke={colors.divider}
                  strokeDasharray="4 4"
                />
              ))}
              <Path d={area} fill={`url(#${id}-area)`} />
              <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
              <Line x1={marker.x} x2={marker.x} y1={marker.y} y2={LINE_BOTTOM} stroke={colors.textMuted} strokeDasharray="3 3" />
              <Circle cx={marker.x} cy={marker.y} r={5} fill={colors.bgApp} stroke={color} strokeWidth={2.5} />
            </Svg>
            {guides.map((value, index) => (
              <Text key={index} style={[styles.guideLabel, { top: yAt(value) - 14 }]} pointerEvents="none">
                {format(value)}
              </Text>
            ))}
            <View style={[styles.tooltip, { left: tooltipLeft }]} pointerEvents="none">
              <Text style={styles.tooltipTitle} numberOfLines={1}>
                {titles[selected]}
              </Text>
              <Text style={styles.tooltipValue} numberOfLines={1}>
                {format(values[selected])}
              </Text>
            </View>
            <View style={styles.hitRow}>
              {values.map((value, index) => (
                <Pressable
                  key={index}
                  style={styles.hit}
                  accessibilityRole="button"
                  accessibilityLabel={`${titles[index]}: ${format(value)}`}
                  onPress={() => setPicked(index)}
                />
              ))}
            </View>
          </>
        )}
      </View>
      <View style={styles.axis}>
        {shown.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.axisLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

type DonutSegment = { value: number; color: string };

export function DonutChart({ segments, size = 96 }: { segments: DonutSegment[]; size?: number }) {
  const stroke = size * 0.16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.segment} strokeWidth={stroke} fill="none" />
      {total > 0 &&
        segments.map((segment, index) => {
          const length = (segment.value / total) * circumference;
          const rotation = (offset / circumference) * 360 - 90;
          offset += length;
          return (
            <Circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(length - 1.5, 0.5)} ${circumference}`}
              fill="none"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const BARS_HEIGHT = 110;

type PairedBarsProps = { items: { label: string; income: number; expense: number }[] };

export function PairedBars({ items }: PairedBarsProps) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...items.flatMap(item => [item.income, item.expense]));
  const slot = items.length ? width / items.length : 0;
  const bar = Math.min(12, slot / 3);
  const height = (value: number) => (value > 0 ? Math.max((value / max) * (BARS_HEIGHT - 4), 3) : 0);

  return (
    <View>
      <View style={styles.bars} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={BARS_HEIGHT}>
            {items.map((item, index) => {
              const center = slot * index + slot / 2;
              return (
                <G key={`${item.label}-${index}`}>
                  <Rect
                    x={center - bar - 1}
                    y={BARS_HEIGHT - height(item.income)}
                    width={bar}
                    height={height(item.income)}
                    rx={3}
                    fill={colors.income}
                  />
                  <Rect
                    x={center + 1}
                    y={BARS_HEIGHT - height(item.expense)}
                    width={bar}
                    height={height(item.expense)}
                    rx={3}
                    fill={colors.expense}
                  />
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      <View style={styles.barAxis}>
        {items.map((item, index) => (
          <Text key={`${item.label}-${index}`} style={[styles.axisLabel, styles.barLabel]} numberOfLines={1}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  line: { height: LINE_HEIGHT },
  guideLabel: { ...typography.labelAxis, position: 'absolute', left: 0, color: colors.textMuted },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    borderRadius: 8,
    backgroundColor: colors.tooltip,
    paddingHorizontal: 10,
    paddingVertical: 6,
    boxShadow: `0px 6px 20px 0px ${colors.shadowTooltip}`,
  },
  tooltipTitle: { ...typography.labelLegend, color: colors.textSecondary },
  tooltipValue: { ...typography.labelLegend, fontSize: 12, color: colors.textPrimary },
  hitRow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  hit: { flex: 1 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { ...typography.labelAxis, color: colors.textMuted },
  bars: { height: BARS_HEIGHT },
  barAxis: { flexDirection: 'row', marginTop: 6 },
  barLabel: { flex: 1, textAlign: 'center' },
}));
