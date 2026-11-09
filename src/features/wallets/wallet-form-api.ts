import { authRequest } from '@/features/auth/auth-request';
import type { Currency, CurrencyType } from '@/features/currencies/currency-api';

import type { WalletType } from './wallet-options';

export type WalletFormData = { userCurrency: Currency; rates: Record<string, number> };

export type NewWallet = {
  name: string;
  type: WalletType;
  currency: string;
  currencyType: CurrencyType;
  initAmount: number;
  exchangeRate?: number;
  color: string;
  icon: string;
  excluded: boolean;
};

type Page<T> = { data: T[] };

const PAGE_SIZE = 200;

export async function loadWalletForm(): Promise<WalletFormData> {
  const [user, rates] = await Promise.all([
    authRequest<{ currency: Currency }>('/users'),
    authRequest<Page<{ currency: { code: string }; exchangeRate: number }>>('/currency-exchange/search', {
      method: 'POST',
      body: { size: PAGE_SIZE },
    }),
  ]);
  return {
    userCurrency: user.currency,
    rates: Object.fromEntries(rates.data.map(rate => [rate.currency.code, rate.exchangeRate])),
  };
}

export async function createWallet(wallet: NewWallet) {
  return authRequest<{ _id: string }>('/wallets', { method: 'POST', body: wallet });
}
