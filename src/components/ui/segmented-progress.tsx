import { StyleSheet, View } from 'react-native';

import { radius } from '@/theme';

const OPACITIES = [1, 0.7, 0.4, 0.3, 0.2, 0.1];

type SegmentedProgressProps = { values: number[]; color: string };

export function SegmentedProgress({ values, color }: SegmentedProgressProps) {
  return (
    <View style={styles.track} accessibilityRole="progressbar">
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            { flexGrow: value, backgroundColor: color, opacity: OPACITIES[Math.min(index, OPACITIES.length - 1)] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 12, padding: 2, flexDirection: 'row', gap: 4, borderRadius: radius.full, overflow: 'hidden' },
  segment: { flexBasis: 0, minWidth: 4, height: '100%', borderRadius: radius.full },
});
