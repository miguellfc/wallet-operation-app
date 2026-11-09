import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/theme';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor: string;
  compact?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && { backgroundColor: activeColor }]}>
            <Text
              style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    minHeight: 42,
    borderRadius: radius.full,
    backgroundColor: colors.segment,
    padding: 4,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    minHeight: 34,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.segmentLabel, color: colors.textSecondary },
  labelCompact: { fontSize: 13, letterSpacing: 0.3 },
  labelActive: { color: colors.textOnBrand },
});
