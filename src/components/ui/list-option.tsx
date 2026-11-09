import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type ListOptionProps = {
  code: string;
  name: string;
  tag: string;
  selected: boolean;
  onPress: () => void;
};

export function ListOption({ code, name, tag, selected, onPress }: ListOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.selected, pressed && styles.pressed]}>
      <Text style={[styles.code, selected && styles.codeSelected]}>{code}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{tag}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.row,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: colors.surface, borderColor: colors.brand },
  pressed: { opacity: 0.85 },
  code: { ...typography.titleStat, width: 64, color: colors.textPrimary },
  codeSelected: { color: colors.brand },
  name: { ...typography.bodyMedium, flex: 1, color: colors.textSecondary },
  tag: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: { ...typography.labelLegend, color: colors.textMuted },
});
