import { loadAccount } from '@/features/auth/account-api';
import { authRequest } from '@/features/auth/auth-request';
import type { Currency, CurrencyType } from '@/features/currencies/currency-api';
import { isLocal } from '@/lib/data-source';
import { listRates } from '@/lib/local-db/exchange-rates';
import * as local from '@/lib/local-db/wallets';

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
  if (isLocal) {
    const [user, rates] = await Promise.all([loadAccount(), listRates()]);
    return {
      userCurrency: user.currency,
      rates: Object.fromEntries(rates.map(rate => [rate.currency.code, rate.exchangeRate])),
    };
  }
  const [user, rates] = await Promise.all([
    loadAccount(),
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
  if (isLocal) return local.createWallet(wallet);
  return authRequest<{ _id: string }>('/wallets', { method: 'POST', body: wallet });
}
