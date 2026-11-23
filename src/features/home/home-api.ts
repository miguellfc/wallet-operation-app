import { loadAccount } from '@/features/auth/account-api';
import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';
import { isLocal } from '@/lib/data-source';

export type OperationKind = 'INCOME' | 'EXPENSE';

export type CategoryTotal = {
  type: OperationKind;
  category: { id: string; name: string; color: string; icon?: string };
  total: number;
  count: number;
};

export type CashFlowPeriod = { period: string; income: number; expense: number; net: number };

export type CashFlowInterval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type CashFlowData = { interval: CashFlowInterval; periods: CashFlowPeriod[] };

export type HomeData = {
  firstName: string;
  currency: Currency;
  balance: number;
  categories: CategoryTotal[];
};

const PERIODS_IN_CHART: Record<CashFlowInterval, number> = { DAY: 7, WEEK: 8, MONTH: 6, YEAR: 5 };

function chartEnd() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
}

function chartStart(interval: CashFlowInterval) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const back = PERIODS_IN_CHART[interval] - 1;
  if (interval === 'DAY') return new Date(Date.UTC(year, month, day - back));
  if (interval === 'WEEK') {
    const monday = day - ((now.getDay() + 6) % 7);
    return new Date(Date.UTC(year, month, monday - back * 7));
  }
  if (interval === 'MONTH') return new Date(Date.UTC(year, month - back, 1));
  return new Date(Date.UTC(year - back, 0, 1));
}

export async function loadCashFlow(interval: CashFlowInterval): Promise<CashFlowData> {
  if (isLocal) return { interval, periods: [] };
  const cashFlow = await authRequest<{ periods: CashFlowPeriod[] }>('/statistics/cash-flow', {
    method: 'POST',
    body: { from: chartStart(interval).toISOString(), to: chartEnd().toISOString(), interval },
  });
  return { interval, periods: cashFlow.periods.slice(-PERIODS_IN_CHART[interval]) };
}

export async function loadHome(): Promise<HomeData> {
  if (isLocal) {
    const profile = await loadAccount();
    return { firstName: profile.firstName, currency: profile.currency, balance: 0, categories: [] };
  }
  const [profile, balance, categories] = await Promise.all([
    loadAccount(),
    authRequest<{ currency: Currency; balance: number }>('/balance'),
    authRequest<{ categories: CategoryTotal[] }>('/statistics/categories', { method: 'POST', body: {} }),
  ]);
  return {
    firstName: profile.firstName,
    currency: balance.currency,
    balance: balance.balance,
    categories: categories.categories,
  };
}
