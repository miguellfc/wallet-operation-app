import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';

export type OperationType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'OPENING';

type OperationWallet = { id: string; name: string };

type CurrencyAmount = { currency: string; amount: number };

export type Operation = {
  _id: string;
  type: OperationType;
  description?: string;
  date: string;
  amount: { from?: CurrencyAmount; to?: CurrencyAmount; user: CurrencyAmount };
  category?: { id: string; name: string };
  wallets: { from?: OperationWallet; to?: OperationWallet };
};

export type DayOperations = {
  firstName: string;
  currency: Currency;
  closingBalance: number;
  income: number;
  expense: number;
  operations: Operation[];
};

type Range = { from: string; to: string };

const DAY_PAGE_SIZE = 200;

function dayRange(day: Date): Range {
  const start = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  const end = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}

export async function loadDayOperations(day: Date): Promise<DayOperations> {
  const range = dayRange(day);
  const [profile, evolution, cashFlow, operations] = await Promise.all([
    authRequest<{ firstName: string }>('/users'),
    authRequest<{ currency: Currency; periods: { balance: number }[] }>('/statistics/evolution', {
      method: 'POST',
      body: { ...range, interval: 'DAY' },
    }),
    authRequest<{ periods: { income: number; expense: number }[] }>('/statistics/cash-flow', {
      method: 'POST',
      body: { ...range, interval: 'DAY' },
    }),
    authRequest<{ data: Operation[] }>('/operations/search', {
      method: 'POST',
      body: {
        filters: { date: { $gte: range.from, $lte: range.to } },
        sort: { date: -1 },
        size: DAY_PAGE_SIZE,
      },
    }),
  ]);

  return {
    firstName: profile.firstName,
    currency: evolution.currency,
    closingBalance: evolution.periods.at(-1)?.balance ?? 0,
    income: cashFlow.periods.reduce((sum, period) => sum + period.income, 0),
    expense: cashFlow.periods.reduce((sum, period) => sum + period.expense, 0),
    operations: operations.data,
  };
}
