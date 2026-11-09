import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/ui/category-icon';
import { colors, layout, radius, spacing, typography } from '@/theme';

export type SheetOption = { value: string; label: string; detail?: string };

type OptionSheetProps = {
  visible: boolean;
  title: string;
  options: SheetOption[];
  selected?: string;
  emptyText: string;
  iconFor: (option: SheetOption) => string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function OptionSheet({ visible, title, options, selected, emptyText, iconFor, onSelect, onClose }: OptionSheetProps) {
  const insets = useSafeAreaInsets();

  const choose = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.handle} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <FlatList
            data={options}
            keyExtractor={item => item.value}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const active = item.value === selected;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => choose(item.value)}
                  style={({ pressed }) => [styles.row, active && styles.selected, pressed && styles.pressed]}>
                  <View style={styles.icon}>
                    <CategoryIcon name={iconFor(item)} color={colors.brand} size={18} />
                  </View>
                  <Text style={[styles.label, active && styles.labelSelected]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.detail && <Text style={styles.detail}>{item.detail}</Text>}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '75%',
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
  title: { ...typography.titleSection, color: colors.textPrimary },
  list: { gap: spacing.sm, paddingBottom: spacing.lg },
  row: {
    minHeight: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.surface, borderColor: colors.brand },
  pressed: { opacity: 0.85 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.incomeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.bodyMedium, flex: 1, color: colors.textPrimary },
  labelSelected: { color: colors.brand },
  detail: { ...typography.bodyMedium, fontSize: 13, color: colors.textSecondary },
  empty: { ...typography.bodyMedium, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },
});
