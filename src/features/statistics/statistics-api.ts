import { authRequest } from '@/features/auth/auth-request';
import type { Currency } from '@/features/currencies/currency-api';
import type { CashFlowPeriod } from '@/features/home/home-api';

export type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export type PeriodRange = { start: Date; end: Date; label: string; current: boolean };

export type Totals = { income: number; expense: number; net: number };

export type CategoryRef = { id: string; name: string; color?: string; icon?: string };

export type CategoryComparison = {
  type: 'INCOME' | 'EXPENSE';
  category: CategoryRef;
  total: number;
  previousTotal: number;
  change: number | null;
};

export type StatisticsSummary = {
  currency: Currency;
  days: number;
  current: Totals;
  previous: Totals;
  changes: { income: number | null; expense: number | null; net: number | null };
  savingsRate: number | null;
  dailyAverage: number;
  categories: CategoryComparison[];
  topIncrease: CategoryComparison | null;
  biggestExpense: { id: string; description?: string; date: string; category: CategoryRef; amount: number } | null;
};

export type WalletBalance = {
  id: string;
  name: string;
  color: string;
  icon: string;
  excluded: boolean;
  currency: Currency;
  balance: number;
  userBalance: number;
};

export type BalancePoint = { period: string; balance: number };

export type StatisticsData = {
  key: string;
  range: PeriodRange;
  previous: PeriodRange;
  summary: StatisticsSummary;
  evolution: BalancePoint[];
  evolutionInterval: 'DAY' | 'MONTH';
  trend: CashFlowPeriod[];
  wallets: WalletBalance[];
};

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const TREND_LENGTH: Record<StatsPeriod, number> = { WEEK: 6, MONTH: 6, YEAR: 5 };

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const utcStart = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();

const utcEnd = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)).toISOString();

function weekLabel(start: Date, end: Date) {
  const left =
    start.getMonth() === end.getMonth() ? `${start.getDate()}` : `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]}`;
  return `${left} – ${end.getDate()} ${SHORT_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

export function periodRange(kind: StatsPeriod, offset: number, now = new Date()): PeriodRange {
  const today = startOfDay(now);
  let start: Date;
  let end: Date;
  let label: string;
  if (kind === 'WEEK') {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    start = addDays(monday, offset * 7);
    end = addDays(start, 6);
    label = weekLabel(start, end);
  } else if (kind === 'MONTH') {
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    label = `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  } else {
    start = new Date(today.getFullYear() + offset, 0, 1);
    end = new Date(start.getFullYear(), 11, 31);
    label = String(start.getFullYear());
  }
  const current = end.getTime() >= today.getTime();
  return { start, end: current ? today : end, label, current };
}

function trendStart(kind: StatsPeriod, start: Date) {
  const back = TREND_LENGTH[kind] - 1;
  if (kind === 'WEEK') return addDays(start, -7 * back);
  if (kind === 'MONTH') return new Date(start.getFullYear(), start.getMonth() - back, 1);
  return new Date(start.getFullYear() - back, 0, 1);
}

export async function loadStatistics(kind: StatsPeriod, offset: number): Promise<StatisticsData> {
  const range = periodRange(kind, offset);
  const previous = periodRange(kind, offset - 1);
  const evolutionInterval = kind === 'YEAR' ? 'MONTH' : 'DAY';

  const [summary, evolution, trend, wallets] = await Promise.all([
    authRequest<StatisticsSummary>('/statistics/summary', {
      method: 'POST',
      body: {
        from: utcStart(range.start),
        to: utcEnd(range.end),
        previousFrom: utcStart(previous.start),
        previousTo: utcEnd(previous.end),
      },
    }),
    authRequest<{ periods: BalancePoint[] }>('/statistics/evolution', {
      method: 'POST',
      body: { from: utcStart(range.start), to: utcEnd(range.end), interval: evolutionInterval },
    }),
    authRequest<{ periods: CashFlowPeriod[] }>('/statistics/cash-flow', {
      method: 'POST',
      body: { from: utcStart(trendStart(kind, range.start)), to: utcEnd(range.end), interval: kind },
    }),
    authRequest<{ wallets: WalletBalance[] }>('/balance/wallets'),
  ]);

  return {
    key: `${kind}:${offset}`,
    range,
    previous,
    summary,
    evolution: evolution.periods,
    evolutionInterval,
    trend: trend.periods.slice(-TREND_LENGTH[kind]),
    wallets: wallets.wallets,
  };
}
