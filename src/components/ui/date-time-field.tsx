import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { clockLabel, shortDateLabel } from '@/lib/format';
import { colors, layout, radius, spacing, typography } from '@/theme';

type DateTimeFieldProps = { label: string; mode: 'date' | 'time'; value: Date; onChange: (date: Date) => void };

export function DateTimeField({ label, mode, value, onChange }: DateTimeFieldProps) {
  const insets = useSafeAreaInsets();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const text = mode === 'date' ? shortDateLabel(value) : clockLabel(value);
  const selectable = Platform.OS === 'ios' || Platform.OS === 'android';
  const maximumDate = mode === 'date' ? new Date() : undefined;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode, maximumDate, onValueChange: (_event, date) => onChange(date) });
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
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        disabled={!selectable}
        onPress={open}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <Text style={styles.value} numberOfLines={1}>
          {text}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIosOpen(false)} accessibilityLabel="Cerrar" />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                maximumDate={maximumDate}
                themeVariant="dark"
                accentColor={colors.brand}
                onValueChange={(_event, date) => setDraft(date)}
              />
              <Button label="Listo" onPress={confirm} />
            </View>
          </View>
        </Modal>
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
