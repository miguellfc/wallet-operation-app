import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { CategoryIcon } from '@/components/ui/category-icon';
import type { OperationsRange } from '@/features/operations/operations-api';
import { rangeLabel } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/theme';

type DatePickerChipProps = { value: OperationsRange; onChange: (range: OperationsRange) => void };

export function DatePickerChip({ value, onChange }: DatePickerChipProps) {
  const [open, setOpen] = useState(false);
  const label = rangeLabel(value.from, value.to);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fecha: ${label}`}
        accessibilityHint="Cambia el día o el rango de fechas que se muestra"
        hitSlop={{ top: 10, bottom: 10 }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <CategoryIcon name="calendario" color={colors.textSecondary} size={12} />
        <Text key={label} style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      <CalendarSheet
        visible={open}
        title="Fechas"
        value={value.from}
        rangeEnd={value.to}
        maximumDate={new Date()}
        onConfirm={day => onChange({ from: day, to: day })}
        onConfirmRange={(from, to) => onChange({ from, to })}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceSubtle,
  },
  pressed: { opacity: 0.8 },
  label: { ...typography.labelLegend, color: colors.textSecondary },
});
