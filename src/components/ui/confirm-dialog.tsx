import { useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

let current: ConfirmRequest | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(listener => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function showConfirm(request: ConfirmRequest) {
  current = request;
  emit();
}

const close = () => {
  current = null;
  emit();
};

export function ConfirmDialogHost() {
  const request = useSyncExternalStore(subscribe, () => current, () => null);

  const accept = () => {
    const action = request?.onConfirm;
    close();
    action?.();
  };

  return (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cancelar" />
        {request && (
          <View style={styles.card} accessibilityViewIsModal>
            <Text style={styles.title} accessibilityRole="header">
              {request.title}
            </Text>
            <Text style={styles.message}>{request.message}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.pressed]}>
                <Text style={styles.cancelLabel}>{request.cancelLabel ?? 'Cancelar'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={accept}
                style={({ pressed }) => [styles.action, styles.confirm, pressed && styles.pressed]}>
                <Text style={styles.confirmLabel}>{request.confirmLabel}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.scrim, padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: layout.maxContentWidth - 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.bgApp,
    padding: spacing.xl,
    gap: spacing.md,
    boxShadow: `0px 0px 24px 0px ${colors.shadowGlow}`,
  },
  title: { ...typography.titleSection, color: colors.textPrimary },
  message: { ...typography.bodyMedium, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { flex: 1, minHeight: layout.minTouchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: colors.input },
  confirm: { backgroundColor: colors.brand },
  pressed: { opacity: 0.85 },
  cancelLabel: { ...typography.buttonLabel, fontSize: 14, color: colors.textPrimary },
  confirmLabel: { ...typography.buttonLabel, fontSize: 14, color: colors.textOnBrand },
}));
