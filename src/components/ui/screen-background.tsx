import { Image } from 'expo-image';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Glow = { left: `${number}%`; top: `${number}%` };

const GLOW_SIZE = 300;

export function ScreenBackground({ glows, children }: PropsWithChildren<{ glows: Glow[] }>) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.glowLayer}>
        {glows.map((glow, index) => (
          <View key={index} style={[styles.anchor, glow]}>
            <Image contentFit="contain" source={require('@/assets/images/glow.svg')} style={styles.glow} />
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  glowLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  anchor: { position: 'absolute', width: 0, height: 0 },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    left: -GLOW_SIZE / 2,
    top: -GLOW_SIZE / 2,
  },
});
