import { loadAccount } from '@/features/auth/account-api';
import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';

export type OperationType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OPENING';

type OperationWallet = { id: string; name: string; currency?: { code: string } };

type CurrencyAmount = { currency: string; amount: number };

export type Operation = {
  _id: string;
  type: OperationType;
  description?: string;
  date: string;
  amount: { from?: CurrencyAmount; to?: CurrencyAmount; user: CurrencyAmount };
  category?: { id: string; name: string; color?: string; icon?: string };
  wallets: { from?: OperationWallet; to?: OperationWallet };
  debt?: { id: string; action: 'OPENING' | 'PAYMENT' | 'INCREASE'; amount: number };
};

export type OperationsRange = { from: Date; to: Date };

export type RangeOperations = {
  firstName: string;
  currency: Currency;
  closingBalance: number;
  income: number;
  expense: number;
  operations: Operation[];
  hasMore: boolean;
};

function utcRange({ from, to }: OperationsRange) {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}

export async function loadRangeOperations(range: OperationsRange, size: number): Promise<RangeOperations> {
  const bounds = utcRange(range);
  const [profile, evolution, cashFlow, operations] = await Promise.all([
    loadAccount(),
    authRequest<{ currency: Currency; periods: { balance: number }[] }>('/statistics/evolution', {
      method: 'POST',
      body: { ...bounds, interval: 'YEAR' },
    }),
    authRequest<{ periods: { income: number; expense: number }[] }>('/statistics/cash-flow', {
      method: 'POST',
      body: { ...bounds, interval: 'YEAR' },
    }),
    authRequest<{ data: Operation[] }>('/operations/search', {
      method: 'POST',
      body: {
        filters: { date: { $gte: bounds.from, $lte: bounds.to } },
        sort: { date: -1 },
        size: size + 1,
      },
    }),
  ]);

  return {
    firstName: profile.firstName,
    currency: evolution.currency,
    closingBalance: evolution.periods.at(-1)?.balance ?? 0,
    income: cashFlow.periods.reduce((sum, period) => sum + period.income, 0),
    expense: cashFlow.periods.reduce((sum, period) => sum + period.expense, 0),
    operations: operations.data.slice(0, size),
    hasMore: operations.data.length > size,
  };
}

export async function loadOperation(id: string) {
  return authRequest<Operation>(`/operations/${id}`);
}

export async function deleteOperation(id: string) {
  return authRequest<unknown>(`/operations/${id}`, { method: 'DELETE' });
}
