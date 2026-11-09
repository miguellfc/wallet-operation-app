import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/ui/category-icon';
import { dayLabel } from '@/lib/format';
import { colors, layout, radius, spacing, typography } from '@/theme';

type DatePickerChipProps = { value: Date; onChange: (date: Date) => void };

export function DatePickerChip({ value, onChange }: DatePickerChipProps) {
  const insets = useSafeAreaInsets();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const label = dayLabel(value);
  const selectable = Platform.OS === 'ios' || Platform.OS === 'android';

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        maximumDate: new Date(),
        onValueChange: (_event, date) => onChange(date),
      });
      return;
    }
    setDraft(value);
    setIosOpen(true);
  };

  const confirm = () => {
    onChange(draft);
    setIosOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fecha: ${label}`}
        accessibilityHint={selectable ? 'Cambia el día que se muestra' : undefined}
        disabled={!selectable}
        hitSlop={{ top: 10, bottom: 10 }}
        onPress={open}
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
        <CategoryIcon name="calendario" color={colors.textSecondary} size={12} />
        <Text key={label} style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIosOpen(false)} accessibilityLabel="Cerrar" />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                themeVariant="dark"
                accentColor={colors.brand}
                onValueChange={(_event, date) => setDraft(date)}
              />
              <Button label="Listo" onPress={confirm} />
            </View>
          </View>
        </Modal>
      )}
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bgApp,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
