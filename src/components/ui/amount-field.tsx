import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { appendKey, evaluate } from '@/lib/calculator';
import { formatAmount, roundTo } from '@/lib/format';
import { colors, layout, radius, spacing, typography } from '@/theme';

type Key = { value: string; label: string; spoken: string; operator?: boolean };

const digit = (value: string): Key => ({ value, label: value, spoken: value });

const ROWS: Key[][] = [
  [digit('7'), digit('8'), digit('9'), { value: '÷', label: '÷', spoken: 'entre', operator: true }],
  [digit('4'), digit('5'), digit('6'), { value: '×', label: '×', spoken: 'por', operator: true }],
  [digit('1'), digit('2'), digit('3'), { value: '−', label: '−', spoken: 'menos', operator: true }],
  [
    { value: '.', label: '.', spoken: 'punto' },
    digit('0'),
    { value: 'back', label: '⌫', spoken: 'borrar' },
    { value: '+', label: '+', spoken: 'más', operator: true },
  ],
];

type AmountFieldProps = {
  label: string;
  value: string;
  currencyCode?: string;
  decimals?: number;
  destination?: { text: string; muted?: boolean };
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function AmountField({
  label,
  value,
  currencyCode,
  decimals,
  destination,
  placeholder,
  disabled = false,
  onChange,
}: AmountFieldProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState('');
  const raw = evaluate(expression);
  const result = raw === null || decimals === undefined ? raw : roundTo(raw, decimals);
  const invalid = expression !== '' && (result === null || result <= 0);
  const money = (amount: number) => (currencyCode ? formatAmount(amount, currencyCode) : String(amount));
  const shown = value === '' ? null : money(Number(value));

  const start = () => {
    setExpression(value);
    setOpen(true);
  };

  const press = (key: string) => {
    setExpression(current => (key === 'back' ? current.slice(0, -1) : appendKey(current, key)));
  };

  const equals = () => {
    if (result !== null && result > 0) setExpression(String(result));
  };

  const done = () => {
    onChange(result === null ? '' : String(result));
    setOpen(false);
  };

  const resultText = invalid
    ? result === null
      ? 'Operación no válida'
      : 'El importe debe ser mayor que 0'
    : `= ${money(result ?? 0)}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{
          text: shown ? (destination ? `Origen ${shown}, destino ${destination.text}` : shown) : (placeholder ?? 'Sin importe'),
        }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={start}
        style={({ pressed }) => [styles.field, disabled && styles.disabled, pressed && styles.pressed]}>
        {shown && destination ? (
          <View style={styles.lines}>
            <View style={styles.line}>
              <Text style={styles.lineLabel}>Origen</Text>
              <Text style={styles.value} numberOfLines={1}>
                {shown}
              </Text>
            </View>
            <View style={styles.line}>
              <Text style={styles.lineLabel}>Destino</Text>
              <Text style={[styles.value, destination.muted && styles.placeholder]} numberOfLines={1}>
                {destination.text}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.value, !shown && styles.placeholder]} numberOfLines={1}>
            {shown ?? placeholder ?? (currencyCode ? `0.00 ${currencyCode}` : '0.00')}
          </Text>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Cerrar" />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.handle} />
            <View style={styles.display}>
              <Text style={styles.expression} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {expression || '0'}
              </Text>
              <Text style={[styles.result, invalid && styles.resultInvalid]} accessibilityLiveRegion="polite">
                {resultText}
              </Text>
            </View>
            <View style={styles.keypad}>
              {ROWS.map(row => (
                <View key={row.map(key => key.value).join('')} style={styles.row}>
                  {row.map(key => (
                    <Pressable
                      key={key.value}
                      accessibilityRole="button"
                      accessibilityLabel={key.spoken}
                      onPress={() => press(key.value)}
                      style={({ pressed }) => [styles.key, key.operator && styles.operator, pressed && styles.keyPressed]}>
                      <Text style={[styles.keyLabel, key.operator && styles.operatorLabel]}>{key.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar"
                  onPress={() => setExpression('')}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
                  <Text style={styles.clearLabel}>C</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Igual"
                  onPress={equals}
                  style={({ pressed }) => [styles.key, styles.operator, pressed && styles.keyPressed]}>
                  <Text style={[styles.keyLabel, styles.operatorLabel]}>=</Text>
                </Pressable>
                <View style={styles.done}>
                  <Button label="Listo" onPress={done} disabled={invalid} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  label: { ...typography.labelOverline, color: colors.textSecondary },
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  value: { ...typography.bodyMedium, flexShrink: 1, color: colors.textPrimary },
  lines: { paddingVertical: spacing.md, gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  lineLabel: { ...typography.labelOverline, color: colors.textMuted },
  placeholder: { color: colors.textMuted },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.bgApp,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.textMuted },
  display: {
    borderRadius: radius.md,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'flex-end',
    gap: 2,
  },
  expression: { ...typography.displayAmount, fontSize: 28, lineHeight: 36, color: colors.textPrimary },
  result: { ...typography.bodyMedium, color: colors.textSecondary },
  resultInvalid: { color: colors.error },
  keypad: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  key: {
    flex: 1,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operator: { backgroundColor: colors.incomeSoft },
  keyPressed: { opacity: 0.7 },
  keyLabel: { ...typography.titleSection, fontSize: 22, lineHeight: 28, color: colors.textPrimary },
  operatorLabel: { color: colors.brand },
  clearLabel: { ...typography.titleSection, fontSize: 20, color: colors.textSecondary },
  done: { flexGrow: 2, flexShrink: 1, flexBasis: spacing.sm },
});
