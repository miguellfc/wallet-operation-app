import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CalendarSheet } from '@/components/ui/calendar-sheet';
import { ClockSheet } from '@/components/ui/clock-sheet';
import { clockLabel, shortDateLabel } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/theme';

type DateTimeFieldProps = { label: string; mode: 'date' | 'time'; value: Date; onChange: (date: Date) => void };

export function DateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const text = mode === 'date' ? shortDateLabel(value) : clockLabel(value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <Text style={styles.value} numberOfLines={1}>
          {text}
        </Text>
      </Pressable>
      {mode === 'date' ? (
        <CalendarSheet
          visible={open}
          title={label}
          value={value}
          maximumDate={new Date()}
          onConfirm={onChange}
          onClose={() => setOpen(false)}
        />
      ) : (
        <ClockSheet visible={open} title={label} value={value} onConfirm={onChange} onClose={() => setOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  value: { ...typography.bodyMedium, color: colors.textPrimary },
});
