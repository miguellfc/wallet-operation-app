import { loadAccount } from '@/features/auth/account-api';
import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';
import { isLocal } from '@/lib/data-source';
import { localCashFlow, localCategoryTotals } from '@/lib/local-db/statistics';
import { localUserBalance } from '@/lib/local-db/wallets';

export type OperationKind = 'INCOME' | 'EXPENSE';

export type CategoryTotal = {
  type: OperationKind;
  category: { id: string; name: string; color: string; icon?: string };
  total: number;
  count: number;
};

export type CashFlowPeriod = { period: string; income: number; expense: number; net: number };

/** The chip the user picks. */
export type CashFlowInterval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

/** How a series is grouped (the API's STATISTICS_INTERVAL). */
export type SeriesInterval = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type CashFlowData = {
  interval: CashFlowInterval;
  /** Grouping of `periods`: hours for Día, days for Semana, months for Mes and years for Año. */
  grouping: SeriesInterval;
  /** The last few periods, ending with the one we are in now. */
  periods: CashFlowPeriod[];
};

export type HomeData = {
  firstName: string;
  currency: Currency;
  balance: number;
  categories: CategoryTotal[];
};

/** Día: the last 6 hours. Semana: the last 7 days. Mes: the last 6 months. Año: the last 5 years. */
const GROUPING: Record<CashFlowInterval, SeriesInterval> = {
  DAY: 'HOUR',
  WEEK: 'DAY',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
};

const PERIODS_IN_CHART: Record<CashFlowInterval, number> = { DAY: 6, WEEK: 7, MONTH: 6, YEAR: 5 };

/**
 * The last periods up to now, so the last point of the chart is the present. Operations store the local wall time as
 * UTC, so the bounds are the local calendar written as UTC.
 */
function chartRange(interval: CashFlowInterval, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const hour = now.getHours();
  const back = PERIODS_IN_CHART[interval] - 1;
  const to = new Date(Date.UTC(year, month, day, hour, now.getMinutes(), 59, 999));
  if (interval === 'DAY') return { from: new Date(Date.UTC(year, month, day, hour - back)), to };
  if (interval === 'WEEK') return { from: new Date(Date.UTC(year, month, day - back)), to };
  if (interval === 'MONTH') return { from: new Date(Date.UTC(year, month - back, 1)), to };
  return { from: new Date(Date.UTC(year - back, 0, 1)), to };
}

export async function loadCashFlow(interval: CashFlowInterval): Promise<CashFlowData> {
  const grouping = GROUPING[interval];
  const { from, to } = chartRange(interval);
  const range = { from: from.toISOString(), to: to.toISOString() };
  const periods = isLocal
    ? await localCashFlow(range, grouping)
    : (
        await authRequest<{ periods: CashFlowPeriod[] }>('/statistics/cash-flow', {
          method: 'POST',
          body: { ...range, interval: grouping },
        })
      ).periods;
  return { interval, grouping, periods };
}

export async function loadHome(): Promise<HomeData> {
  if (isLocal) {
    const profile = await loadAccount();
    const [balance, categories] = await Promise.all([
      localUserBalance(profile.currency),
      localCategoryTotals({ to: new Date().toISOString() }),
    ]);
    return { firstName: profile.firstName, currency: profile.currency, balance, categories };
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
