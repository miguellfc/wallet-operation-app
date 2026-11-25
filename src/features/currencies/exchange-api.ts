import { loadAccount } from '@/features/auth/account-api';
import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';
import { isLocal } from '@/lib/data-source';
import * as local from '@/lib/local-db/exchange-rates';

export type ExchangeRate = { _id: string; currency: Currency; exchangeRate: number; targetCurrency: string };

export type ExchangeRatesData = { userCurrency: Currency; rates: ExchangeRate[] };

export async function loadExchangeRates(): Promise<ExchangeRatesData> {
  if (isLocal) {
    const [user, rates] = await Promise.all([loadAccount(), local.listRates()]);
    return { userCurrency: user.currency, rates };
  }
  const [user, page] = await Promise.all([
    loadAccount(),
    authRequest<{ data: ExchangeRate[] }>('/currency-exchange/search', {
      method: 'POST',
      body: { sort: { 'currency.code': 1 }, size: 200 },
    }),
  ]);
  return { userCurrency: user.currency, rates: page.data };
}

export async function createExchangeRate(currency: Currency, exchangeRate: number) {
  if (isLocal) return local.createRate(currency, exchangeRate);
  return authRequest<{ _id: string }>('/currency-exchange', {
    method: 'POST',
    body: { currency: currency.code, type: currency.type, exchangeRate },
  });
}

export async function updateExchangeRate(id: string, exchangeRate: number) {
  if (isLocal) return local.updateRate(id, exchangeRate);
  return authRequest<{ _id: string }>(`/currency-exchange/${id}`, { method: 'PATCH', body: { exchangeRate } });
}

export async function deleteExchangeRate(id: string) {
  if (isLocal) return local.deleteRate(id);
  return authRequest<unknown>(`/currency-exchange/${id}`, { method: 'DELETE' });
}
