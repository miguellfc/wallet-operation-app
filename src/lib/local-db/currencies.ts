import type { Currency } from '@/features/currencies/currency-api';

import data from './currencies.json';

export const localCurrencies = data as Currency[];

export function findLocalCurrency(code: string, type: Currency['type']) {
  return localCurrencies.find(currency => currency.code === code && currency.type === type) ?? null;
}
