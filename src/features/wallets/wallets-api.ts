import { authRequest } from '@/features/auth/auth-request';
import type { CurrencyType } from '@/features/currencies/currency-api';
import type { Operation } from '@/features/operations/operations-api';
import { currencyDecimals } from '@/lib/format';

type CurrencyRef = { code: string };

type Page<T> = { data: T[] };

const PAGE_SIZE = 200;

export type WalletSummary = {
  id: string;
  name: string;
  excluded: boolean;
  icon: string;
  color: string;
  currencyCode: string;
  decimals: number;
  balance: number;
};

export type WalletsData = { balance: number; currencyCode: string; wallets: WalletSummary[] };

export type Debt = {
  _id: string;
  person: string;
  type: 'LENT' | 'BORROWED';
  pending: number;
  description?: string;
  currency: CurrencyRef;
};

export type Recurrence = {
  _id: string;
  recurrence: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  nextExecution: string | null;
  operations: string[];
};

export type RecurrenceItem = { recurrence: Recurrence; template?: Operation };

export async function loadProfile() {
  return authRequest<{ firstName: string }>('/users');
}

export async function loadWallets(): Promise<WalletsData> {
  const [total, wallets] = await Promise.all([
    authRequest<{ currency: CurrencyRef; balance: number }>('/balance'),
    authRequest<Page<{ _id: string; name: string; excluded: boolean; icon: string; color: string; currency: CurrencyRef & { type: CurrencyType } }>>('/wallets/search', {
      method: 'POST',
      body: { size: PAGE_SIZE, sort: { createdAt: 1 } },
    }),
  ]);
  const balances = await Promise.all(
    wallets.data.map(wallet => authRequest<{ balance: number }>(`/balance/wallet/${wallet._id}`)),
  );
  return {
    balance: total.balance,
    currencyCode: total.currency.code,
    wallets: wallets.data.map((wallet, index) => ({
      id: wallet._id,
      name: wallet.name,
      excluded: wallet.excluded,
      icon: wallet.icon,
      color: wallet.color,
      currencyCode: wallet.currency.code,
      decimals: currencyDecimals(wallet.currency.code, wallet.currency.type),
      balance: balances[index].balance,
    })),
  };
}

export async function loadDebts() {
  const page = await authRequest<Page<Debt>>('/debts/search', {
    method: 'POST',
    body: { filters: { status: { $in: ['PENDING', 'PARTIAL'] } }, sort: { date: -1 }, size: PAGE_SIZE },
  });
  return page.data;
}

export async function loadRecurrences(): Promise<RecurrenceItem[]> {
  const page = await authRequest<Page<Recurrence>>('/recurrences/search', {
    method: 'POST',
    body: { filters: { completed: false }, sort: { nextExecution: 1 }, size: PAGE_SIZE },
  });
  const ids = page.data.flatMap(item => item.operations);
  if (ids.length === 0) return page.data.map(recurrence => ({ recurrence }));

  const operations = await authRequest<Page<Operation>>('/operations/search', {
    method: 'POST',
    body: { filters: { _id: { $in: ids } }, sort: { date: -1 }, size: PAGE_SIZE },
  });
  return page.data.map(recurrence => ({
    recurrence,
    template: operations.data.find(operation => recurrence.operations.includes(operation._id)),
  }));
}
