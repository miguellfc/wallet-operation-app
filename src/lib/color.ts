import { colors, currentTheme } from '@/theme';

function channels(color: string) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16));
}

const linear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
};

export function luminance(color: string) {
  const rgb = channels(color);
  if (!rgb) return 0.5;
  const [red, green, blue] = rgb.map(linear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export const onColor = (background: string) => (luminance(background) > 0.4 ? colors.textOnBrand : colors.textInverse);

function mix(color: string, target: string, amount: number) {
  const from = channels(color);
  const to = channels(target);
  if (!from || !to) return color;
  const mixed = from.map((value, index) => Math.round(value + (to[index] - value) * amount));
  return `#${mixed.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

export function readable(color: string) {
  if (currentTheme() !== 'light' || luminance(color) < 0.35) return color;
  return mix(color, colors.textPrimary, 0.45);
}
