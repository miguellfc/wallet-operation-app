import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

type BrandGradientProps = { radius: number; x1?: number; y1?: number; x2?: number; y2?: number };

export function BrandGradient({ radius, x1 = 0.05, y1 = 0.9, x2 = 0.79, y2 = 0.06 }: BrandGradientProps) {
  const id = useId();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  // The layout size is fractional, but the SVG canvas is cut to whole pixels, so a rounded rect drawn edge to edge
  // lost its right or bottom border depending on the screen density. The native view clips the rounded corners
  // instead, and the SVG only paints the colors, one pixel bigger than the view so no edge is left uncovered.
  const width = Math.ceil(size.width) + 1;
  const height = Math.ceil(size.height) + 1;

  return (
    <View
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      pointerEvents="none"
      onLayout={onLayout}>
      {size.width > 0 && (
        <Svg width={width} height={height} style={styles.canvas}>
          <Defs>
            <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
              <Stop offset={0} stopColor={colors.gradientYellow} />
              <Stop offset={0.346} stopColor={colors.gradientGreen} />
              <Stop offset={0.75} stopColor={colors.gradientTeal} />
              <Stop offset={1} stopColor={colors.gradientIndigo} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ canvas: { position: 'absolute', top: 0, left: 0 } });
