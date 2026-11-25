import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { textOn } from '@/lib/color';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAYS = [
  { short: 'L', long: 'lunes' },
  { short: 'M', long: 'martes' },
  { short: 'X', long: 'miércoles' },
  { short: 'J', long: 'jueves' },
  { short: 'V', long: 'viernes' },
  { short: 'S', long: 'sábado' },
  { short: 'D', long: 'domingo' },
];

type CalendarSheetProps = {
  visible: boolean;
  title: string;
  value: Date;
  maximumDate?: Date;
  rangeEnd?: Date;
  onConfirm: (date: Date) => void;
  onConfirmRange?: (from: Date, to: Date) => void;
  onClose: () => void;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const dayKey = (date: Date) => date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();

function monthCells(month: Date) {
  const offset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= days; day++) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarSheet({
  visible,
  title,
  value,
  maximumDate,
  rangeEnd,
  onConfirm,
  onConfirmRange,
  onClose,
}: CalendarSheetProps) {
  const ranged = !!onConfirmRange;
  const [shown, setShown] = useState(false);
  const [draft, setDraft] = useState(value);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);
  const [picking, setPicking] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(value));

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      setDraft(value);
      setDraftEnd(rangeEnd && dayKey(rangeEnd) !== dayKey(value) ? rangeEnd : null);
      setPicking(false);
      setMonth(startOfMonth(rangeEnd ?? value));
    }
  }

  const today = dayKey(new Date());
  const limit = maximumDate ? dayKey(maximumDate) : Infinity;
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canGoNext = dayKey(nextMonth) <= limit;
  const cells = monthCells(month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  const start = dayKey(draft);
  const end = draftEnd ? dayKey(draftEnd) : start;

  const pick = (cell: Date) => {
    if (!ranged) {
      setDraft(cell);
      return;
    }
    if (!picking) {
      setDraft(cell);
      setDraftEnd(null);
      setPicking(true);
      return;
    }
    const key = dayKey(cell);
    if (key < start) {
      setDraftEnd(draft);
      setDraft(cell);
    } else if (key > start) {
      setDraftEnd(cell);
    }
    setPicking(false);
  };

  const confirm = () => {
    if (onConfirmRange) {
      const last = draftEnd ?? draft;
      onConfirmRange(
        new Date(draft.getFullYear(), draft.getMonth(), draft.getDate()),
        new Date(last.getFullYear(), last.getMonth(), last.getDate()),
      );
      onClose();
      return;
    }
    onConfirm(new Date(draft.getFullYear(), draft.getMonth(), draft.getDate(), value.getHours(), value.getMinutes()));
    onClose();
  };

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          hitSlop={8}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} tintColor={colors.brand} style={[styles.chevron, styles.left]} />
        </Pressable>
        <Text style={styles.month} accessibilityLiveRegion="polite">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          accessibilityState={{ disabled: !canGoNext }}
          disabled={!canGoNext}
          hitSlop={8}
          onPress={() => setMonth(nextMonth)}
          style={({ pressed }) => [styles.arrow, !canGoNext && styles.off, pressed && styles.pressed]}>
          <Image contentFit="contain" source={require('@/assets/icons/chevron-down.svg')} tintColor={colors.brand} style={[styles.chevron, styles.right]} />
        </Pressable>
      </View>
      {ranged && <Text style={styles.hint}>Toca el día de inicio y luego el de fin, o un solo día.</Text>}
      <View style={styles.grid}>
        <View style={styles.week}>
          {WEEKDAYS.map(day => (
            <Text key={day.long} style={styles.weekday} accessibilityLabel={day.long}>
              {day.short}
            </Text>
          ))}
        </View>
        {weeks.map(week => (
          <View key={week.map(cell => (cell ? dayKey(cell) : 'x')).join('-')} style={styles.week}>
            {week.map((cell, index) => {
              if (!cell) return <View key={`empty-${index}`} style={styles.cell} />;
              const key = dayKey(cell);
              const selected = key === start || key === end;
              const inRange = key > start && key < end;
              const disabled = key > limit;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.getDate()} de ${MONTHS[cell.getMonth()].toLowerCase()}`}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => pick(cell)}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.day,
                    key === today && styles.today,
                    inRange && styles.inRange,
                    selected && styles.selected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.dayLabel, disabled && styles.dayDisabled, selected && styles.dayLabelSelected]}>
                    {cell.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Button label="Listo" onPress={confirm} />
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  month: { ...typography.bodyMedium, fontFamily: typography.titleSection.fontFamily, color: colors.textPrimary },
  grid: { gap: spacing.xs },
  week: { flexDirection: 'row' },
  weekday: { ...typography.labelOverline, flex: 1, textAlign: 'center', color: colors.textMuted },
  cell: { flex: 1, aspectRatio: 1, maxHeight: 44, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: radius.full, borderWidth: 1, borderColor: 'transparent' },
  today: { borderColor: colors.brand },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand },
  inRange: { backgroundColor: colors.incomeSoft, borderColor: colors.incomeSoft },
  hint: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  dayLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  dayDisabled: { color: colors.textMuted, opacity: 0.5 },
  dayLabelSelected: { color: textOn(colors.brand), fontFamily: typography.titleSection.fontFamily },
}));
