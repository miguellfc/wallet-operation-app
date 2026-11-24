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
  { value: 'PurseWalletIcon', label: 'Cartera' },
  { value: 'CardholderWalletIcon', label: 'Tarjetero' },
  { value: 'CreditWalletIcon', label: 'Crédito' },
  { value: 'TransferWalletIcon', label: 'Transferencias' },
  { value: 'DollarWalletIcon', label: 'Dólares' },
  { value: 'BanknotesWalletIcon', label: 'Billetes' },
  { value: 'SafeWalletIcon', label: 'Caja fuerte' },
  { value: 'BusinessWalletIcon', label: 'Negocio' },
  { value: 'ShopWalletIcon', label: 'Tienda' },
  { value: 'TravelWalletIcon', label: 'Viajes' },
  { value: 'InternationalWalletIcon', label: 'Internacional' },
  { value: 'EmergencyWalletIcon', label: 'Emergencias' },
  { value: 'HomeWalletIcon', label: 'Hogar' },
  { value: 'SharedWalletIcon', label: 'Compartida' },
  { value: 'QrWalletIcon', label: 'Pago QR' },
  { value: 'GoalWalletIcon', label: 'Metas' },
  { value: 'OnlineWalletIcon', label: 'En línea' },
];

export const WALLET_COLORS = [
  { value: '#E57373', label: 'Rojo claro' },
  { value: '#EF5350', label: 'Rojo' },
  { value: '#FFAB91', label: 'Salmón' },
  { value: '#FF8A65', label: 'Coral' },
  { value: '#FFB74D', label: 'Naranja' },
  { value: '#FFD54F', label: 'Ámbar' },
  { value: '#FEFC69', label: 'Amarillo' },
  { value: '#DCE775', label: 'Lima' },
  { value: '#50A137', label: 'Verde' },
  { value: '#B1FF9D', label: 'Verde claro' },
  { value: '#81C784', label: 'Esmeralda' },
  { value: '#9FF8DF', label: 'Turquesa' },
  { value: '#4DB6AC', label: 'Verde azulado' },
  { value: '#80DEEA', label: 'Cian' },
  { value: '#4FC3F7', label: 'Celeste' },
  { value: '#8CC5FC', label: 'Azul' },
  { value: '#5C8DF6', label: 'Azul intenso' },
  { value: '#5C6BC0', label: 'Marino' },
  { value: '#BAC3FF', label: 'Lavanda' },
  { value: '#97A1F9', label: 'Índigo' },
  { value: '#9575CD', label: 'Morado' },
  { value: '#BA68C8', label: 'Orquídea' },
  { value: '#CE93D8', label: 'Violeta' },
  { value: '#F8BBD0', label: 'Rosa palo' },
  { value: '#F06292', label: 'Rosa' },
  { value: '#EC407A', label: 'Frambuesa' },
  { value: '#A1887F', label: 'Marrón' },
  { value: '#D7CCC8', label: 'Arena' },
  { value: '#90A4AE', label: 'Pizarra' },
  { value: '#C6C5D3', label: 'Gris' },
];

export const DEFAULT_WALLET_ICON = WALLET_ICON_OPTIONS[0].value;

export const DEFAULT_WALLET_COLOR = '#97A1F9';

export function softColor(color: string, alpha = 0.15) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return `rgba(152, 167, 255, ${alpha})`;
  const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
  const [red, green, blue] = [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
