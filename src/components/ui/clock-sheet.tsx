import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

type Mode = 'hour' | 'minute';

type ClockSheetProps = {
  visible: boolean;
  title: string;
  value: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
};

const DIAL = 260;
const CENTER = DIAL / 2;
const RADIUS = CENTER - 30;
const KNOB = 20;

const pad = (value: number) => String(value).padStart(2, '0');

const pointAt = (angle: number, distance = RADIUS) => {
  const radians = (angle * Math.PI) / 180;
  return { x: CENTER + distance * Math.sin(radians), y: CENTER - distance * Math.cos(radians) };
};

export function ClockSheet({ visible, title, value, onConfirm, onClose }: ClockSheetProps) {
  const [shown, setShown] = useState(false);
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());
  const [mode, setMode] = useState<Mode>('hour');
  const dialRef = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef({ x: 0, y: 0 });

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setHour(value.getHours());
      setMinute(value.getMinutes());
      setMode('hour');
    }
  }

  const pm = hour >= 12;
  const hour12 = hour % 12 || 12;
  const angle = mode === 'hour' ? (hour % 12) * 30 : minute * 6;
  const knob = pointAt(angle);
  const labels =
    mode === 'hour'
      ? Array.from({ length: 12 }, (_, index) => ({ value: index === 0 ? 12 : index, text: String(index === 0 ? 12 : index), angle: index * 30 }))
      : Array.from({ length: 12 }, (_, index) => ({ value: index * 5, text: pad(index * 5), angle: index * 30 }));
  const activeLabel = mode === 'hour' ? hour12 : minute;

  const pick = (pageX: number, pageY: number) => {
    const x = pageX - origin.current.x - CENTER;
    const y = pageY - origin.current.y - CENTER;
    const degrees = (Math.atan2(x, -y) * 180) / Math.PI;
    const normalized = (degrees + 360) % 360;
    if (mode === 'hour') setHour((Math.round(normalized / 30) % 12) + (pm ? 12 : 0));
    else setMinute(Math.round(normalized / 6) % 60);
  };

  const grant = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    dialRef.current?.measure((_x, _y, _width, _height, left, top) => {
      origin.current = { x: left, y: top };
      pick(pageX, pageY);
    });
  };

  const move = (event: GestureResponderEvent) => pick(event.nativeEvent.pageX, event.nativeEvent.pageY);

  const release = () => {
    if (mode === 'hour') setMode('minute');
  };

  const setPeriod = (afternoon: boolean) => {
    if (afternoon !== pm) setHour((hour + 12) % 24);
  };

  const confirm = () => {
    onConfirm(new Date(value.getFullYear(), value.getMonth(), value.getDate(), hour, minute));
    onClose();
  };

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.display}>
        <View style={styles.time}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hora ${hour12}`}
            accessibilityState={{ selected: mode === 'hour' }}
            onPress={() => setMode('hour')}
            style={[styles.segment, mode === 'hour' && styles.segmentActive]}>
            <Text style={[styles.digits, mode === 'hour' && styles.digitsActive]}>{pad(hour12)}</Text>
          </Pressable>
          <Text style={styles.colon}>:</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Minutos ${minute}`}
            accessibilityState={{ selected: mode === 'minute' }}
            onPress={() => setMode('minute')}
            style={[styles.segment, mode === 'minute' && styles.segmentActive]}>
            <Text style={[styles.digits, mode === 'minute' && styles.digitsActive]}>{pad(minute)}</Text>
          </Pressable>
        </View>
        <View style={styles.period}>
          {(['AM', 'PM'] as const).map(period => {
            const active = (period === 'PM') === pm;
            return (
              <Pressable
                key={period}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPeriod(period === 'PM')}
                style={[styles.periodOption, active && styles.periodActive]}>
                <Text style={[styles.periodLabel, active && styles.periodLabelActive]}>{period}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View
        ref={dialRef}
        style={styles.dial}
        accessibilityLabel={mode === 'hour' ? 'Esfera de horas' : 'Esfera de minutos'}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={grant}
        onResponderMove={move}
        onResponderRelease={release}>
        <Svg width={DIAL} height={DIAL} pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Line x1={CENTER} y1={CENTER} x2={knob.x} y2={knob.y} stroke={colors.brand} strokeWidth={2} />
          <Circle cx={CENTER} cy={CENTER} r={4} fill={colors.brand} />
          <Circle cx={knob.x} cy={knob.y} r={KNOB} fill={colors.brand} />
        </Svg>
        {labels.map(label => {
          const point = pointAt(label.angle);
          const active = label.value === activeLabel;
          return (
            <Text
              key={label.text}
              pointerEvents="none"
              style={[styles.dialLabel, { left: point.x - KNOB, top: point.y - KNOB }, active && styles.dialLabelActive]}>
              {label.text}
            </Text>
          );
        })}
      </View>
      <Button label="Listo" onPress={confirm} />
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  display: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  time: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  segment: { borderRadius: radius.md, backgroundColor: colors.input, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  segmentActive: { backgroundColor: colors.incomeSoft },
  digits: { ...typography.displayAmount, color: colors.textPrimary },
  digitsActive: { color: colors.brand },
  colon: { ...typography.displayAmount, color: colors.textSecondary },
  period: { borderRadius: radius.md, backgroundColor: colors.input, padding: 2, gap: 2 },
  periodOption: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  periodActive: { backgroundColor: colors.brand },
  periodLabel: { ...typography.labelLegend, color: colors.textSecondary },
  periodLabelActive: { color: colors.textOnBrand },
  dial: {
    width: DIAL,
    height: DIAL,
    alignSelf: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.input,
  },
  dialLabel: {
    ...typography.bodyMedium,
    position: 'absolute',
    width: KNOB * 2,
    height: KNOB * 2,
    lineHeight: KNOB * 2,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  dialLabelActive: { color: colors.textOnBrand, fontFamily: typography.titleSection.fontFamily },
}));
