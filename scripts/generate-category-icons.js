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
  InvestmentWalletIcon: 'graph-new-up-linear',
  DigitalWalletIcon: 'smartphone-linear',
  GiftWalletIcon: 'gift-linear',
  default: 'wallet-linear',
};

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
