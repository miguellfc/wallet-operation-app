import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { textOn } from '@/lib/color';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { FilterChips } from '@/components/ui/filter-chips';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import {
  defaultRecurrence,
  recurrenceSummary,
  unitLabel,
  type Frequency,
  type RecurrenceDraft,
  type RecurrenceEnd,
} from '@/features/operations/recurrence-form-api';
import { colors, radius, spacing, themedStyles, typography } from '@/theme';

const MAX_DELAY = 99;

const MAX_TIMES = 999;

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'DAILY', label: 'Diaria' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'YEARLY', label: 'Anual' },
];

const ENDS: { value: RecurrenceEnd; label: string }[] = [
  { value: 'FOREVER', label: 'Nunca' },
  { value: 'TIMES', label: 'Veces' },
  { value: 'UNTIL', label: 'Hasta' },
];

const WEEKDAYS = [
  { day: 1, short: 'L', long: 'lunes' },
  { day: 2, short: 'M', long: 'martes' },
  { day: 3, short: 'X', long: 'miércoles' },
  { day: 4, short: 'J', long: 'jueves' },
  { day: 5, short: 'V', long: 'viernes' },
  { day: 6, short: 'S', long: 'sábado' },
  { day: 0, short: 'D', long: 'domingo' },
];

const dayKey = (date: Date) => date.getFullYear() * 10000 + date.getMonth() * 100 + date.getDate();

type RecurrenceSheetProps = {
  visible: boolean;
  value: RecurrenceDraft | null;
  start: Date;
  onConfirm: (draft: RecurrenceDraft) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function RecurrenceSheet({ visible, value, start, onConfirm, onRemove, onClose }: RecurrenceSheetProps) {
  const [shown, setShown] = useState(false);
  const [draft, setDraft] = useState(() => value ?? defaultRecurrence(start));
  const [times, setTimes] = useState('1');

  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      const next = value ?? defaultRecurrence(start);
      setDraft(next);
      setTimes(String(next.times));
    }
  }

  const update = (changes: Partial<RecurrenceDraft>) => setDraft(current => ({ ...current, ...changes }));

  const parsedTimes = Number(times);
  const timesValid = times !== '' && Number.isInteger(parsedTimes) && parsedTimes >= 1 && parsedTimes <= MAX_TIMES;
  const untilValid = dayKey(draft.until) > dayKey(start);
  const problem =
    draft.end === 'TIMES' && !timesValid
      ? `Escribe un número entero entre 1 y ${MAX_TIMES}.`
      : draft.end === 'UNTIL' && !untilValid
        ? 'La fecha de fin tiene que ser posterior a la de la operación.'
        : null;
  const preview = { ...draft, times: timesValid ? parsedTimes : draft.times };

  const toggleDay = (day: number) => {
    const selected = draft.daysOfWeek.includes(day);
    if (selected && draft.daysOfWeek.length === 1) return;
    update({ daysOfWeek: selected ? draft.daysOfWeek.filter(item => item !== day) : [...draft.daysOfWeek, day] });
  };

  const confirm = () => {
    if (problem) return;
    onConfirm(preview);
    onClose();
  };

  const remove = () => {
    onRemove();
    onClose();
  };

  return (
    <BottomSheet visible={visible} title="Repetición" onClose={onClose}>
      <FilterChips options={FREQUENCIES} value={draft.frequency} onChange={frequency => update({ frequency })} />
      <View style={styles.stepperRow}>
        <Text style={styles.label}>Cada</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Menos"
            accessibilityState={{ disabled: draft.delay <= 1 }}
            disabled={draft.delay <= 1}
            hitSlop={6}
            onPress={() => update({ delay: draft.delay - 1 })}
            style={({ pressed }) => [styles.step, draft.delay <= 1 && styles.off, pressed && styles.pressed]}>
            <Text style={styles.stepLabel}>–</Text>
          </Pressable>
          <Text style={styles.stepValue} accessibilityLiveRegion="polite">
            {draft.delay} {unitLabel(draft.frequency, draft.delay)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Más"
            accessibilityState={{ disabled: draft.delay >= MAX_DELAY }}
            disabled={draft.delay >= MAX_DELAY}
            hitSlop={6}
            onPress={() => update({ delay: draft.delay + 1 })}
            style={({ pressed }) => [styles.step, draft.delay >= MAX_DELAY && styles.off, pressed && styles.pressed]}>
            <Text style={styles.stepLabel}>+</Text>
          </Pressable>
        </View>
      </View>
      {draft.frequency === 'WEEKLY' && (
        <View style={styles.block}>
          <Text style={styles.label}>Días</Text>
          <View style={styles.days}>
            {WEEKDAYS.map(item => {
              const selected = draft.daysOfWeek.includes(item.day);
              return (
                <Pressable
                  key={item.day}
                  accessibilityRole="checkbox"
                  accessibilityLabel={item.long}
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleDay(item.day)}
                  style={({ pressed }) => [styles.day, selected && styles.daySelected, pressed && styles.pressed]}>
                  <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{item.short}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      {draft.frequency === 'MONTHLY' && (
        <View style={styles.block}>
          <Text style={styles.label}>Qué día</Text>
          <SegmentedControl
            options={[
              { value: 'SAME', label: `Día ${start.getDate()}` },
              { value: 'LAST', label: 'Último día' },
            ]}
            value={draft.lastMonthDay ? 'LAST' : 'SAME'}
            onChange={choice => update({ lastMonthDay: choice === 'LAST' })}
            activeColor={colors.brand}
            compact
          />
        </View>
      )}
      <View style={styles.block}>
        <Text style={styles.label}>Termina</Text>
        <SegmentedControl options={ENDS} value={draft.end} onChange={end => update({ end })} activeColor={colors.brand} compact />
      </View>
      {draft.end === 'TIMES' && (
        <TextField
          label="Repetir"
          value={times}
          onChangeText={text => setTimes(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={3}
          accessory={<Text style={styles.suffix}>{parsedTimes === 1 ? 'vez más' : 'veces más'}</Text>}
        />
      )}
      {draft.end === 'UNTIL' && (
        <DateTimeField label="Hasta" mode="date" value={draft.until} allowFuture onChange={until => update({ until })} />
      )}
      <Text style={[styles.summary, problem && styles.problem]} accessibilityLiveRegion="polite">
        {problem ?? recurrenceSummary(preview, start)}
      </Text>
      <Button label="Listo" onPress={confirm} disabled={!!problem} />
      {value && (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={remove}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
          <Text style={styles.removeLabel}>Quitar repetición</Text>
        </Pressable>
      )}
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  block: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: { ...typography.buttonLabel, color: colors.brand },
  stepValue: { ...typography.bodyMedium, minWidth: 92, textAlign: 'center', color: colors.textPrimary },
  off: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  days: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  day: {
    flex: 1,
    maxWidth: 44,
    aspectRatio: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  dayLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  dayLabelSelected: { color: textOn(colors.brand), fontFamily: typography.titleSection.fontFamily },
  suffix: { ...typography.bodyMedium, color: colors.textSecondary },
  summary: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  problem: { color: colors.error },
  remove: { alignSelf: 'center', paddingVertical: spacing.xs },
  removeLabel: { ...typography.bodyMedium, color: colors.danger },
}));
