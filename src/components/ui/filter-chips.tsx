import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type FilterChipsProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 10, bottom: 10 }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.brand },
  label: { ...typography.labelLegend, color: colors.textSecondary },
  labelActive: { color: colors.textOnBrand },
});
