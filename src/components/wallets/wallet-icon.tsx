import { SvgXml } from 'react-native-svg';

import { WALLET_ICONS } from '@/features/wallets/wallet-icons';

type WalletIconProps = { name: string; color: string; size?: number };

export function WalletIcon({ name, color, size = 18 }: WalletIconProps) {
  return <SvgXml xml={WALLET_ICONS[name] ?? WALLET_ICONS.default} color={color} width={size} height={size} />;
}
