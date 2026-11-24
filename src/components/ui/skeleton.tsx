import { useEffect, useState, type PropsWithChildren } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { css, cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { colors, radius, spacing, themedStyles } from '@/theme';

type BoneProps = { width?: DimensionValue; height?: number; round?: number; style?: StyleProp<ViewStyle> };

export function Bone({ width = '100%', height = 12, round = radius.sm, style }: BoneProps) {
  const reduced = useReducedMotion();
  return <Animated.View style={[styles.bone, { width, height, borderRadius: round }, !reduced && motion.pulse, style]} />;
}

const SHOW_DELAY = 400;

export function Skeleton({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_DELAY);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={[styles.group, style]} accessible accessibilityRole="progressbar" accessibilityLabel="Cargando">
      {shown && children}
    </View>
  );
}

export function SkeletonCard({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SkeletonHero({ bar = false }: { bar?: boolean }) {
  return (
    <SkeletonCard style={styles.hero}>
      <Bone width={50} height={50} round={radius.full} style={styles.heroBadge} />
      <Bone width={120} height={16} />
      <Bone width="62%" height={32} round={radius.md} style={styles.heroAmount} />
      {bar && <Bone height={5} round={radius.full} style={styles.heroBar} />}
    </SkeletonCard>
  );
}

export function SkeletonSummaryPair({ captions = false }: { captions?: boolean }) {
  return (
    <View style={styles.pair}>
      {[0, 1].map(index => (
        <SkeletonCard key={index} style={styles.summary}>
          <View style={styles.summaryRow}>
            <Bone width={33} height={33} round={radius.full} />
            <View style={styles.flexLines}>
              <Bone width="55%" height={10} />
              <Bone width="80%" height={18} />
            </View>
          </View>
          {captions && <Bone width="45%" height={10} style={styles.caption} />}
        </SkeletonCard>
      ))}
    </View>
  );
}

export function SkeletonChips({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.chips}>
      {Array.from({ length: count }, (_, index) => (
        <Bone key={index} width="auto" height={24} round={radius.full} style={styles.grow} />
      ))}
    </View>
  );
}

const BARS = [0.55, 0.8, 0.4, 0.95, 0.6, 0.75, 0.35];

export function SkeletonBars({ height = 170 }: { height?: number }) {
  return (
    <View style={[styles.bars, { height }]}>
      {BARS.map((value, index) => (
        <Bone key={index} width="auto" height={Math.round(height * value)} style={styles.grow} />
      ))}
    </View>
  );
}

export function SkeletonChart({ chips = true }: { chips?: boolean }) {
  return (
    <SkeletonCard style={styles.chart}>
      <Bone width={150} height={18} />
      {chips && <SkeletonChips />}
      <SkeletonBars />
    </SkeletonCard>
  );
}

export function SkeletonRows({ count = 4, title = false }: { count?: number; title?: boolean }) {
  return (
    <View style={styles.rows}>
      {title && <Bone width={110} height={14} style={styles.rowsTitle} />}
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} style={styles.row}>
          <Bone width={36} height={36} round={radius.sm} />
          <View style={styles.flexLines}>
            <Bone width="60%" height={14} />
            <Bone width="40%" height={10} />
          </View>
          <View style={styles.side}>
            <Bone width={72} height={14} />
            <Bone width={48} height={10} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

export function SkeletonWalletGrid({ count = 4 }: { count?: number }) {
  const rows = Array.from({ length: Math.ceil(count / 2) }, (_, index) => index);
  return (
    <View style={styles.rows}>
      <Bone width={170} height={18} />
      {rows.map(row => (
        <View key={row} style={styles.gridRow}>
          {[0, 1].map(column => (
            <SkeletonCard key={column} style={styles.walletCard}>
              <Bone width={34} height={34} round={radius.full} />
              <Bone width="50%" height={12} />
              <Bone width="65%" height={14} />
            </SkeletonCard>
          ))}
        </View>
      ))}
    </View>
  );
}

export function SkeletonDetails({ rows = 4, actions = 0 }: { rows?: number; actions?: number }) {
  return (
    <SkeletonCard style={styles.details}>
      <Bone width={90} height={16} />
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.detailRow}>
          <Bone width="32%" height={10} />
          <Bone width="28%" height={12} />
        </View>
      ))}
      {actions > 0 && (
        <View style={styles.actions}>
          {Array.from({ length: actions }, (_, index) => (
            <Bone key={index} width="auto" height={50} round={radius.full} style={styles.grow} />
          ))}
        </View>
      )}
    </SkeletonCard>
  );
}

export function SkeletonSummary() {
  return (
    <SkeletonCard style={styles.centered}>
      <Bone width={66} height={66} round={radius.full} />
      <Bone width={140} height={14} />
      <Bone width="55%" height={32} round={radius.md} />
    </SkeletonCard>
  );
}

export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <View style={styles.form}>
      {Array.from({ length: fields }, (_, index) => (
        <View key={index} style={styles.field}>
          <Bone width={90} height={10} />
          <Bone height={48} round={radius.md} />
        </View>
      ))}
      <Bone height={52} round={radius.full} style={styles.submit} />
    </View>
  );
}

export function SkeletonList({ count = 8 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.listRow}>
          <Bone width={44} height={16} />
          <Bone width={`${40 + ((index * 17) % 35)}%`} height={12} />
        </View>
      ))}
    </View>
  );
}

const PULSE = css.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.4 },
});

const motion = css.create({
  pulse: {
    animationName: PULSE,
    animationDuration: 900,
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationTimingFunction: cubicBezier(0.45, 0, 0.55, 1),
  },
});

const styles = themedStyles(() => ({
  bone: { backgroundColor: colors.track },
  group: { gap: spacing.xl },
  grow: { flex: 1 },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacing.lg },
  flexLines: { flex: 1, gap: 6 },
  hero: { minHeight: 161, borderRadius: 32, paddingHorizontal: 23, paddingTop: 76, paddingBottom: 24 },
  heroBadge: { position: 'absolute', top: 19, right: 21 },
  heroAmount: { marginTop: 10 },
  heroBar: { marginTop: spacing.xl },
  pair: { flexDirection: 'row', gap: 21 },
  summary: { flex: 1, minHeight: 70, paddingHorizontal: 10, paddingVertical: spacing.sm, justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  caption: { marginTop: spacing.sm, marginLeft: 6 },
  chips: { flexDirection: 'row', gap: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingHorizontal: spacing.xs },
  chart: { gap: spacing.lg, paddingHorizontal: 14, paddingTop: 22, paddingBottom: 21 },
  rows: { gap: spacing.md },
  rowsTitle: { marginTop: spacing.xs },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  side: { alignItems: 'flex-end', gap: 6 },
  gridRow: { flexDirection: 'row', gap: 15 },
  walletCard: { flex: 1, minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  details: { gap: spacing.lg, padding: 29 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 12, marginTop: spacing.sm },
  centered: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  form: { gap: spacing.xl },
  field: { gap: spacing.sm },
  submit: { marginTop: spacing.sm },
  list: { gap: spacing.lg, paddingVertical: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
}));
