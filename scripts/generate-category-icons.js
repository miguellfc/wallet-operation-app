const fs = require('fs');
const path = require('path');
const { icons } = require('@iconify-json/solar/icons.json');

const CATEGORY_ICONS = {
  reembolso: 'card-recive-linear',
  premios: 'cup-star-linear',
  subsidios: 'hand-money-linear',
  dividendos: 'graph-up-linear',
  inversiones: 'graph-new-up-linear',
  loteria: 'ticket-linear',
  salario: 'wallet-money-linear',
  cupones: 'ticket-sale-linear',
  otros: 'widget-linear',
  utilidades: 'lightbulb-bolt-linear',
  ropa: 't-shirt-linear',
  educacion: 'square-academic-cap-linear',
  entretenimiento: 'masks-linear',
  aptitud: 'dumbbell-large-linear',
  comida: 'chef-hat-minimalistic-linear',
  regalos: 'gift-linear',
  salud: 'heart-pulse-linear',
  belleza: 'cosmetic-linear',
  casa: 'armchair-linear',
  compras: 'bag-smile-linear',
  transporte: 'bus-linear',
  gasolina: 'gas-station-linear',
  viajes: 'plane-linear',
  mascotas: 'paw-linear',
  cafe: 'cup-hot-linear',
  bebidas: 'wineglass-linear',
  telefono: 'phone-linear',
  internet: 'wi-fi-router-linear',
  suscripciones: 'tv-linear',
  musica: 'music-notes-linear',
  videojuegos: 'gamepad-linear',
  libros: 'book-linear',
  alquiler: 'key-linear',
  impuestos: 'bill-list-linear',
  seguros: 'umbrella-linear',
  farmacia: 'pills-linear',
  deportes: 'football-linear',
  tecnologia: 'monitor-smartphone-linear',
  prestamo: 'hand-money-linear',
  transferencia: 'transfer-horizontal-linear',
  'saldo inicial': 'safe-square-linear',
  calendario: 'calendar-minimalistic-linear',
  billetera: 'dollar-minimalistic-linear',
  'me debe': 'card-recive-linear',
  'le debo': 'card-send-linear',
  recurrente: 'repeat-linear',
  default: 'tag-linear',
};

const WALLET_ICONS = {
  CashWalletIcon: 'banknote-2-linear',
  CardWalletIcon: 'card-linear',
  BankWalletIcon: 'buildings-2-linear',
  SavingsWalletIcon: 'safe-2-linear',
  MoneyBagWalletIcon: 'money-bag-linear',
  InvestmentWalletIcon: 'chart-2-linear',
  DigitalWalletIcon: 'smartphone-linear',
  GiftWalletIcon: 'bag-heart-linear',
  PurseWalletIcon: 'wallet-2-linear',
  CardholderWalletIcon: 'cardholder-linear',
  CreditWalletIcon: 'card-2-linear',
  TransferWalletIcon: 'card-transfer-linear',
  DollarWalletIcon: 'dollar-linear',
  BanknotesWalletIcon: 'banknote-linear',
  SafeWalletIcon: 'safe-circle-linear',
  BusinessWalletIcon: 'case-round-linear',
  ShopWalletIcon: 'shop-2-linear',
  TravelWalletIcon: 'suitcase-linear',
  InternationalWalletIcon: 'earth-linear',
  EmergencyWalletIcon: 'shield-check-linear',
  HomeWalletIcon: 'home-2-linear',
  SharedWalletIcon: 'users-group-rounded-linear',
  QrWalletIcon: 'qr-code-linear',
  GoalWalletIcon: 'flag-linear',
  OnlineWalletIcon: 'laptop-linear',
  default: 'wallet-linear',
};

const INTERNAL_CATEGORY_ICONS = new Set([
  'prestamo',
  'transferencia',
  'saldo inicial',
  'calendario',
  'billetera',
  'me debe',
  'le debo',
  'recurrente',
  'default',
]);

const MIN_ICONS = 20;

function selectable(map, internal) {
  return Object.entries(map).filter(([key]) => !internal.has(key));
}

function validate() {
  const lists = {
    categorías: selectable(CATEGORY_ICONS, INTERNAL_CATEGORY_ICONS),
    billeteras: selectable(WALLET_ICONS, new Set(['default'])),
  };
  const owner = new Map();
  for (const [list, entries] of Object.entries(lists)) {
    if (entries.length < MIN_ICONS) throw new Error(`La lista de ${list} tiene ${entries.length} iconos (mínimo ${MIN_ICONS})`);
    for (const [key, name] of entries) {
      const previous = owner.get(name);
      if (previous) throw new Error(`Icono repetido ${name}: ${previous} y ${list}/${key}`);
      owner.set(name, `${list}/${key}`);
    }
  }
}

validate();

function writeIcons(constName, map, ...segments) {
  const entries = Object.entries(map).map(([key, name]) => {
    const icon = icons[name];
    if (!icon) throw new Error(`Solar icon not found: ${name}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${icon.body}</svg>`;
    return `  ${JSON.stringify(key)}: ${JSON.stringify(svg)},`;
  });
  const output = `export const ${constName}: Record<string, string> = {\n${entries.join('\n')}\n};\n`;
  const target = path.join(__dirname, '..', 'src', 'features', ...segments);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
  console.log(`Wrote ${entries.length} icons to ${path.relative(process.cwd(), target)}`);
}

writeIcons('CATEGORY_ICONS', CATEGORY_ICONS, 'categories', 'category-icons.ts');
writeIcons('WALLET_ICONS', WALLET_ICONS, 'wallets', 'wallet-icons.ts');
