import { SvgXml } from 'react-native-svg';

import { CATEGORY_ICONS } from '@/features/categories/category-icons';
import { normalizeName } from '@/lib/format';

type CategoryIconProps = { name: string; color: string; size?: number };

export function CategoryIcon({ name, color, size = 21 }: CategoryIconProps) {
  const xml = CATEGORY_ICONS[normalizeName(name)] ?? CATEGORY_ICONS.default;
  return <SvgXml xml={xml} color={color} width={size} height={size} />;
}
