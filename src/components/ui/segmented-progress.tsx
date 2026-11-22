import { View } from 'react-native';

import { radius, themedStyles } from '@/theme';

type SegmentedProgressProps = { segments: { value: number; color: string }[] };

export function SegmentedProgress({ segments }: SegmentedProgressProps) {
  return (
    <View style={styles.track} accessibilityRole="progressbar">
      {segments.map((segment, index) => (
        <View key={index} style={[styles.segment, { flexGrow: segment.value, backgroundColor: segment.color }]} />
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
  track: { height: 12, padding: 2, flexDirection: 'row', gap: 4, borderRadius: radius.full, overflow: 'hidden' },
  segment: { flexBasis: 0, minWidth: 4, height: '100%', borderRadius: radius.full },
}));
