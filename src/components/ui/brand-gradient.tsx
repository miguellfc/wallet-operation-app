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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.width > 0 && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
              <Stop offset={0} stopColor={colors.gradientYellow} />
              <Stop offset={0.346} stopColor={colors.gradientGreen} />
              <Stop offset={0.75} stopColor={colors.gradientTeal} />
              <Stop offset={1} stopColor={colors.gradientIndigo} />
            </LinearGradient>
          </Defs>
          <Rect width={size.width} height={size.height} rx={radius} ry={radius} fill={`url(#${id})`} />
        </Svg>
      )}
    </View>
  );
}
