import { loadAccount } from '@/features/auth/account-api';
import { authRequest } from '@/features/auth/auth-request';
import type { CurrencyType } from '@/features/currencies/currency-api';
import type { Operation } from '@/features/operations/operations-api';
import { isLocal } from '@/lib/data-source';
import { listOpenDebts } from '@/lib/local-db/debts';
import { listLocalRecurrences } from '@/lib/local-db/recurrences';
import * as local from '@/lib/local-db/wallets';
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
  return loadAccount();
}

export async function loadWallets(): Promise<WalletsData> {
  if (isLocal) return local.listWallets();
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

export async function loadDebts(): Promise<Debt[]> {
  if (isLocal) return listOpenDebts();
  const page = await authRequest<Page<Debt>>('/debts/search', {
    method: 'POST',
    body: { filters: { status: { $in: ['PENDING', 'PARTIAL'] } }, sort: { date: -1 }, size: PAGE_SIZE },
  });
  return page.data;
}

export async function loadRecurrences(): Promise<RecurrenceItem[]> {
  if (isLocal) return listLocalRecurrences();
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

export type WalletDocument = {
  _id: string;
  name: string;
  type: 'GENERAL' | 'CREDIT_CARD';
  icon: string;
  color: string;
  excluded: boolean;
  initAmount: number;
  currency: { code: string; currency: string; symbol: string; type: CurrencyType };
};

export type WalletDetail = {
  wallet: WalletDocument;
  balance: number;
  decimals: number;
  counts: { income: number; expense: number; transfer: number };
  wallets: { id: string; name: string; currencyCode: string }[];
  operations: Operation[];
  hasMore: boolean;
};

export async function loadWallet(id: string) {
  if (isLocal) return local.getWallet(id);
  return authRequest<WalletDocument>(`/wallets/${id}`);
}

export async function loadWalletDetail(id: string, size: number): Promise<WalletDetail> {
  if (isLocal) return local.getWalletDetail(id, size);
  const [wallet, summary, wallets, operations] = await Promise.all([
    loadWallet(id),
    authRequest<{ balance: number; counts: WalletDetail['counts'] }>(`/balance/wallet/${id}/summary`),
    authRequest<Page<{ _id: string; name: string; currency: CurrencyRef }>>('/wallets/search', {
      method: 'POST',
      body: { size: PAGE_SIZE, sort: { createdAt: 1 }, projections: { name: 1, currency: 1 } },
    }),
    authRequest<Page<Operation>>('/operations/search', {
      method: 'POST',
      body: {
        filters: { $or: [{ 'wallets.from.id': id }, { 'wallets.to.id': id }] },
        sort: { date: -1 },
        size: size + 1,
      },
    }),
  ]);
  return {
    wallet,
    balance: summary.balance,
    decimals: currencyDecimals(wallet.currency.code, wallet.currency.type),
    counts: summary.counts,
    wallets: wallets.data.map(item => ({ id: item._id, name: item.name, currencyCode: item.currency.code })),
    operations: operations.data.slice(0, size),
    hasMore: operations.data.length > size,
  };
}

export async function adjustWalletBalance(id: string, balance: number, date: string) {
  if (isLocal) return local.adjustWalletBalance(id, balance, date);
  return authRequest<{ _id: string }>(`/wallets/${id}/adjust`, { method: 'POST', body: { balance, date } });
}

export async function updateWallet(id: string, changes: Record<string, unknown>) {
  if (isLocal) return local.updateWallet(id, changes as local.WalletChanges);
  return authRequest<{ _id: string }>(`/wallets/${id}`, { method: 'PATCH', body: changes });
}
