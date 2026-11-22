import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';

export type ExchangeRate = { _id: string; currency: Currency; exchangeRate: number; targetCurrency: string };

export type ExchangeRatesData = { userCurrency: Currency; rates: ExchangeRate[] };

export async function loadExchangeRates(): Promise<ExchangeRatesData> {
  const [user, page] = await Promise.all([
    authRequest<{ currency: Currency }>('/users'),
    authRequest<{ data: ExchangeRate[] }>('/currency-exchange/search', {
      method: 'POST',
      body: { sort: { 'currency.code': 1 }, size: 200 },
    }),
  ]);
  return { userCurrency: user.currency, rates: page.data };
}

export async function createExchangeRate(currency: Currency, exchangeRate: number) {
  return authRequest<{ _id: string }>('/currency-exchange', {
    method: 'POST',
    body: { currency: currency.code, type: currency.type, exchangeRate },
  });
}

export async function updateExchangeRate(id: string, exchangeRate: number) {
  return authRequest<{ _id: string }>(`/currency-exchange/${id}`, { method: 'PATCH', body: { exchangeRate } });
}

export async function deleteExchangeRate(id: string) {
  return authRequest<unknown>(`/currency-exchange/${id}`, { method: 'DELETE' });
}
