type DefaultCategory = { name: string; type: 'INCOME' | 'EXPENSE'; color: string; system?: boolean };

export const DEFAULT_WALLET = {
  name: 'Cash',
  type: 'GENERAL',
  initAmount: 0,
  color: '#50A137',
  icon: 'CashWalletIcon',
  excluded: false,
} as const;

export const LOAN_CATEGORY_NAME = 'Préstamo';

export const ADJUSTMENT_CATEGORY_NAME = 'Ajuste';

const BASE_CATEGORIES: DefaultCategory[] = [
  { name: 'Reembolso', type: 'INCOME', color: '#0FFBFF' },
  { name: 'Premios', type: 'INCOME', color: '#021E1F' },
  { name: 'Subsidios', type: 'INCOME', color: '#08FFC9' },
  { name: 'Dividendos', type: 'INCOME', color: '#FEFF1A' },
  { name: 'Inversiones', type: 'INCOME', color: '#FFC313' },
  { name: 'Lotería', type: 'INCOME', color: '#FF9111' },
  { name: 'Salario', type: 'INCOME', color: '#940D61' },
  { name: 'Cupones', type: 'INCOME', color: '#39043B' },
  { name: 'Otros', type: 'INCOME', color: '#F167FF' },
  { name: 'Utilidades', type: 'EXPENSE', color: '#0FFBFF' },
  { name: 'Ropa', type: 'EXPENSE', color: '#145CFF' },
  { name: 'Educación', type: 'EXPENSE', color: '#08FFC9' },
  { name: 'Entretenimiento', type: 'EXPENSE', color: '#021E1F' },
  { name: 'Aptitud', type: 'EXPENSE', color: '#0BFF63' },
  { name: 'Comida', type: 'EXPENSE', color: '#FEFF1A' },
  { name: 'Regalos', type: 'EXPENSE', color: '#FFC313' },
  { name: 'Salud', type: 'EXPENSE', color: '#FF9111' },
  { name: 'Belleza', type: 'EXPENSE', color: '#940D61' },
  { name: 'Casa', type: 'EXPENSE', color: '#39043B' },
  { name: 'Compras', type: 'EXPENSE', color: '#F167FF' },
];

const SYSTEM_CATEGORIES: DefaultCategory[] = [
  { name: LOAN_CATEGORY_NAME, type: 'INCOME', color: '#6C5CE7', system: true },
  { name: LOAN_CATEGORY_NAME, type: 'EXPENSE', color: '#6C5CE7', system: true },
  { name: ADJUSTMENT_CATEGORY_NAME, type: 'INCOME', color: '#8F909D', system: true },
  { name: ADJUSTMENT_CATEGORY_NAME, type: 'EXPENSE', color: '#8F909D', system: true },
];

export const DEFAULT_CATEGORIES = [...BASE_CATEGORIES, ...SYSTEM_CATEGORIES];
