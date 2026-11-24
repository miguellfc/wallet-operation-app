import { View } from 'react-native';

import { valuesKey } from '@/lib/motion';
import { Grow } from '@/components/ui/grow';
import { radius, themedStyles } from '@/theme';

type SegmentedProgressProps = { segments: { value: number; color: string }[] };

export function SegmentedProgress({ segments }: SegmentedProgressProps) {
  return (
    <Grow key={valuesKey(segments.map(segment => segment.value))} axis="x" style={styles.track}>
      <View style={styles.inner} accessibilityRole="progressbar">
        {segments.map((segment, index) => (
          <View key={index} style={[styles.segment, { flexGrow: segment.value, backgroundColor: segment.color }]} />
        ))}
      </View>
    </Grow>
  );
}

const styles = themedStyles(() => ({
  track: { height: 12, borderRadius: radius.full, overflow: 'hidden' },
  inner: { flex: 1, padding: 2, flexDirection: 'row', gap: 4 },
  segment: { flexBasis: 0, minWidth: 4, height: '100%', borderRadius: radius.full },
}));
