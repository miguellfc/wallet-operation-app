import { apiRequest } from '@/lib/api';
import { isLocal } from '@/lib/data-source';
import { localCurrencies } from '@/lib/local-db/currencies';

export type CurrencyType = 'FIAT' | 'CRYPTO';

export type Currency = {
  code: string;
  currency: string;
  symbol: string;
  type: CurrencyType;
};

type CurrencyPage = { data: Currency[]; total: number; page: number };

const PAGE_SIZE = 200;

export async function fetchCurrencies() {
  if (isLocal) return localCurrencies;
  const currencies: Currency[] = [];
  for (let page = 1; ; page++) {
    const result = await apiRequest<CurrencyPage>('/currency/search', {
      method: 'POST',
      body: { page, size: PAGE_SIZE },
    });
    currencies.push(...result.data);
    if (result.data.length < PAGE_SIZE || currencies.length >= result.total) return currencies;
  }
}
