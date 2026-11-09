import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';

export type OperationKind = 'INCOME' | 'EXPENSE';

export type CategoryTotal = {
  type: OperationKind;
  category: { id: string; name: string; color: string; icon?: string };
  total: number;
  count: number;
};

export type CashFlowPeriod = { period: string; income: number; expense: number; net: number };

type Profile = { firstName: string; lastName: string };

export type HomeData = {
  firstName: string;
  currency: Currency;
  balance: number;
  categories: CategoryTotal[];
  cashFlow: CashFlowPeriod[];
};

const MONTHS_IN_CHART = 6;

function chartStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_IN_CHART - 1), 1));
}

export async function loadHome(): Promise<HomeData> {
  const [profile, balance, categories, cashFlow] = await Promise.all([
    authRequest<Profile>('/users'),
    authRequest<{ currency: Currency; balance: number }>('/balance'),
    authRequest<{ categories: CategoryTotal[] }>('/statistics/categories', { method: 'POST', body: {} }),
    authRequest<{ periods: CashFlowPeriod[] }>('/statistics/cash-flow', {
      method: 'POST',
      body: { from: chartStart().toISOString(), interval: 'MONTH' },
    }),
  ]);
  return {
    firstName: profile.firstName,
    currency: balance.currency,
    balance: balance.balance,
    categories: categories.categories,
    cashFlow: cashFlow.periods.slice(-MONTHS_IN_CHART),
  };
}
