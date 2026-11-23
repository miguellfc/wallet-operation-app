import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SheetModal } from '@/components/ui/sheet-modal';
import { colors, layout, radius, spacing, themedStyles, typography } from '@/theme';

type GridItem = { value: string; label: string };

type GridSheetProps = {
  visible: boolean;
  title: string;
  items: GridItem[];
  selected?: string;
  renderItem: (item: GridItem) => ReactNode;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function GridSheet({ visible, title, items, selected, renderItem, onSelect, onClose }: GridSheetProps) {
  const insets = useSafeAreaInsets();

  const choose = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <SheetModal visible={visible} onClose={onClose} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <ScrollView contentContainerStyle={styles.grid}>
            {items.map(item => {
              const active = item.value === selected;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => choose(item.value)}
                  style={({ pressed }) => [styles.cell, active && styles.selected, pressed && styles.pressed]}>
                  {renderItem(item)}
                </Pressable>
              );
            })}
          </ScrollView>
    </SheetModal>
  );
}

const styles = themedStyles(() => ({
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
  title: { ...typography.titleSection, color: colors.textPrimary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
    paddingBottom: spacing.lg,
  },
  cell: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.row,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.surface, borderColor: colors.brand },
  pressed: { opacity: 0.85 },
}));
