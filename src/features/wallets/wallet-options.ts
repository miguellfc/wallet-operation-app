export type WalletType = 'GENERAL' | 'CREDIT_CARD';

export const WALLET_TYPES: { value: WalletType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
];

export const WALLET_ICON_OPTIONS = [
  { value: 'CashWalletIcon', label: 'Efectivo' },
  { value: 'CardWalletIcon', label: 'Tarjeta' },
  { value: 'BankWalletIcon', label: 'Banco' },
  { value: 'SavingsWalletIcon', label: 'Ahorro' },
  { value: 'MoneyBagWalletIcon', label: 'Bolsa de dinero' },
  { value: 'InvestmentWalletIcon', label: 'Inversión' },
  { value: 'DigitalWalletIcon', label: 'Digital' },
  { value: 'GiftWalletIcon', label: 'Regalo' },
];

export const WALLET_COLORS = [
  { value: '#97A1F9', label: 'Índigo' },
  { value: '#BAC3FF', label: 'Lavanda' },
  { value: '#8CC5FC', label: 'Azul' },
  { value: '#9FF8DF', label: 'Turquesa' },
  { value: '#B1FF9D', label: 'Verde claro' },
  { value: '#50A137', label: 'Verde' },
  { value: '#FEFC69', label: 'Amarillo' },
  { value: '#FFB74D', label: 'Naranja' },
  { value: '#FF8A65', label: 'Coral' },
  { value: '#F06292', label: 'Rosa' },
  { value: '#CE93D8', label: 'Violeta' },
  { value: '#C6C5D3', label: 'Gris' },
];

export const DEFAULT_WALLET_ICON = WALLET_ICON_OPTIONS[0].value;

export const DEFAULT_WALLET_COLOR = WALLET_COLORS[0].value;

export function softColor(color: string, alpha = 0.15) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return `rgba(152, 167, 255, ${alpha})`;
  const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
  const [red, green, blue] = [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
