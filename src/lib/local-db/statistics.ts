import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/features/currencies/currency-api';
import type { CashFlowPeriod, CategoryTotal, SeriesInterval } from '@/features/home/home-api';
import type {
  BalancePoint,
  CategoryComparison,
  CategoryRef,
  StatisticsSummary,
  WalletBalance,
} from '@/features/statistics/statistics-api';

import { getDatabase } from './database';
import { decimalsOf, roundHalfUp } from './money';
import { requireProfile } from './profile';

type Range = { from?: string; to: string };

type FlowRow = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  description: string | null;
  amount: number;
  category_id: string;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
};

const DAY_MS = 86_400_000;

const HOUR_MS = 3_600_000;

function startOfInterval(iso: string, interval: SeriesInterval) {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (interval === 'YEAR') return Date.UTC(year, 0, 1);
  if (interval === 'MONTH') return Date.UTC(year, month, 1);
  if (interval === 'WEEK') return Date.UTC(year, month, day - ((date.getUTCDay() + 6) % 7));
  if (interval === 'HOUR') return Date.UTC(year, month, day, date.getUTCHours());
  return Date.UTC(year, month, day);
}

function nextPeriod(time: number, interval: SeriesInterval) {
  const date = new Date(time);
  if (interval === 'YEAR') return Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  if (interval === 'MONTH') return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  if (interval === 'HOUR') return time + HOUR_MS;
  return time + (interval === 'WEEK' ? 7 : 1) * DAY_MS;
}

function densify(periods: Set<number>, interval: SeriesInterval) {
  const sorted = [...periods].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const all: number[] = [];
  for (let period = sorted[0]; period <= sorted[sorted.length - 1]; period = nextPeriod(period, interval)) {
    all.push(period);
  }
  return all;
}

function rangePeriods({ from, to }: Range, interval: SeriesInterval) {
  return [...(from ? [startOfInterval(from, interval)] : []), startOfInterval(to, interval)];
}

function roundHalfEven(value: number) {
  const floor = Math.floor(value);
  if (Math.abs(value - floor - 0.5) > 1e-9) return Math.round(value);
  return floor % 2 === 0 ? floor : floor + 1;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return roundHalfEven(((current - previous) / Math.abs(previous)) * 100);
}

const categoryOf = (row: FlowRow): CategoryRef => ({
  id: row.category_id,
  name: row.category_name,
  ...(row.category_color ? { color: row.category_color } : {}),
  ...(row.category_icon ? { icon: row.category_icon } : {}),
});

const byTypeThenTotal = <T extends { type: string; total: number }>(a: T, b: T) =>
  a.type === b.type ? b.total - a.total : a.type < b.type ? -1 : 1;

async function incomeExpenseRows(db: SQLiteDatabase, ranges: Range[]) {
  const conditions = ranges.map(() => '((? IS NULL OR date >= ?) AND date <= ?)').join(' OR ');
  return db.getAllAsync<FlowRow>(
    `SELECT id, type, date, description, amount_user_amount AS amount,
            category_id, category_name, category_color, category_icon
     FROM operations
     WHERE deleted = 0 AND type IN ('INCOME', 'EXPENSE') AND debt_id IS NULL AND adjustment = 0 AND (${conditions})
     ORDER BY date DESC, id DESC`,
    ranges.flatMap(range => [range.from ?? null, range.from ?? null, range.to]),
  );
}

async function context() {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  return { db, currency: profile.currency, round: (value: number) => roundHalfUp(value, decimalsOf(profile.currency)) };
}

export async function localCategoryTotals(range: Range): Promise<CategoryTotal[]> {
  const { db, round } = await context();
  const rows = await incomeExpenseRows(db, [range]);
  const groups = new Map<string, CategoryTotal>();
  for (const row of rows) {
    const key = `${row.type}:${row.category_id}`;
    const group = groups.get(key);
    if (group) {
      group.total += row.amount;
      group.count += 1;
    } else {
      const category = { ...categoryOf(row), color: row.category_color ?? '' };
      groups.set(key, { type: row.type, category, total: row.amount, count: 1 });
    }
  }
  return [...groups.values()].map(group => ({ ...group, total: round(group.total) })).sort(byTypeThenTotal);
}

export async function localCashFlow(range: Range, interval: SeriesInterval): Promise<CashFlowPeriod[]> {
  const { db, round } = await context();
  const rows = await incomeExpenseRows(db, [range]);
  const sums = new Map<number, { income: number; expense: number }>();
  const periods = new Set(rangePeriods(range, interval));
  for (const row of rows) {
    const period = startOfInterval(row.date, interval);
    periods.add(period);
    const sum = sums.get(period) ?? { income: 0, expense: 0 };
    if (row.type === 'INCOME') sum.income += row.amount;
    else sum.expense += row.amount;
    sums.set(period, sum);
  }
  return densify(periods, interval).map(period => {
    const { income, expense } = sums.get(period) ?? { income: 0, expense: 0 };
    return {
      period: new Date(period).toISOString(),
      income: round(income),
      expense: round(expense),
      net: round(income - expense),
    };
  });
}

export async function localBalanceEvolution(range: Range, interval: SeriesInterval): Promise<BalancePoint[]> {
  const { db, round } = await context();
  const rows = await db.getAllAsync<{ date: string; amount: number }>(
    `SELECT moves.date, moves.amount FROM (
       SELECT date, wallet_to_id AS wallet_id, amount_user_amount AS amount FROM operations
       WHERE deleted = 0 AND wallet_to_id IS NOT NULL AND date <= ?1
       UNION ALL
       SELECT date, wallet_from_id, -amount_user_amount FROM operations
       WHERE deleted = 0 AND wallet_from_id IS NOT NULL AND date <= ?1
     ) AS moves
     JOIN wallets ON wallets.id = moves.wallet_id AND wallets.deleted = 0 AND wallets.excluded = 0`,
    [range.to],
  );
  const floor = range.from ? startOfInterval(range.from, interval) : null;
  const changes = new Map<number, number>();
  const periods = new Set(rangePeriods(range, interval));
  for (const row of rows) {
    const own = startOfInterval(row.date, interval);
    const period = floor !== null ? Math.max(own, floor) : own;
    periods.add(period);
    changes.set(period, (changes.get(period) ?? 0) + row.amount);
  }
  let balance = 0;
  return densify(periods, interval).map(period => {
    balance += changes.get(period) ?? 0;
    return { period: new Date(period).toISOString(), balance: round(balance) };
  });
}

const dayNumber = (iso: string) => Math.floor(new Date(iso).getTime() / DAY_MS);

type Group = { type: FlowRow['type']; category: CategoryRef; total: number; previousTotal: number };

export async function localStatisticsSummary(range: {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}): Promise<StatisticsSummary> {
  const { db, currency, round } = await context();
  const current = { from: range.from, to: range.to };
  const previous = { from: range.previousFrom, to: range.previousTo };
  const rows = await incomeExpenseRows(db, [current, previous]);
  const inRange = (row: FlowRow, { from, to }: { from: string; to: string }) => row.date >= from && row.date <= to;

  const totals = { income: 0, expense: 0, previousIncome: 0, previousExpense: 0 };
  const groups = new Map<string, Group>();
  let biggest: FlowRow | null = null;

  for (const row of rows) {
    const isCurrent = inRange(row, current);
    const isPrevious = inRange(row, previous);
    if (isCurrent) {
      if (row.type === 'INCOME') totals.income += row.amount;
      else totals.expense += row.amount;
      if (row.type === 'EXPENSE' && (!biggest || row.amount > biggest.amount)) biggest = row;
    }
    if (isPrevious) {
      if (row.type === 'INCOME') totals.previousIncome += row.amount;
      else totals.previousExpense += row.amount;
    }
    const key = `${row.type}:${row.category_id}`;
    const group = groups.get(key) ?? { type: row.type, category: categoryOf(row), total: 0, previousTotal: 0 };
    if (isCurrent) group.total += row.amount;
    if (isPrevious) group.previousTotal += row.amount;
    groups.set(key, group);
  }

  const income = round(totals.income);
  const expense = round(totals.expense);
  const previousIncome = round(totals.previousIncome);
  const previousExpense = round(totals.previousExpense);
  const net = income - expense;
  const previousNet = previousIncome - previousExpense;
  const days = dayNumber(range.to) - dayNumber(range.from) + 1;

  const rounded = [...groups.values()]
    .map(group => ({ ...group, total: round(group.total), previousTotal: round(group.previousTotal) }))
    .sort(byTypeThenTotal);
  const comparison = (item: Group): CategoryComparison => ({
    type: item.type,
    category: item.category,
    total: item.total,
    previousTotal: item.previousTotal,
    change: item.previousTotal === 0 ? null : percentChange(item.total, item.previousTotal),
  });
  const rising = rounded.filter(item => item.type === 'EXPENSE' && item.total - item.previousTotal > 0);
  const top = rising.reduce<Group | null>(
    (value, item) => (!value || item.total - item.previousTotal > value.total - value.previousTotal ? item : value),
    null,
  );
  const largest = biggest as FlowRow | null;

  return {
    currency,
    days,
    current: { income, expense, net: round(net) },
    previous: { income: previousIncome, expense: previousExpense, net: round(previousNet) },
    changes: {
      income: percentChange(income, previousIncome),
      expense: percentChange(expense, previousExpense),
      net: percentChange(net, previousNet),
    },
    savingsRate: income > 0 ? roundHalfEven((net / income) * 100) : null,
    dailyAverage: round(expense / days),
    categories: rounded.filter(item => item.total > 0).map(comparison),
    topIncrease: top ? comparison(top) : null,
    biggestExpense: largest
      ? {
          id: largest.id,
          ...(largest.description ? { description: largest.description } : {}),
          date: largest.date,
          category: categoryOf(largest),
          amount: round(largest.amount),
        }
      : null,
  };
}

type WalletBalanceRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  excluded: number;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  currency_type: Currency['type'];
  balance: number | null;
  user_balance: number | null;
};

export async function localWalletBalances(): Promise<WalletBalance[]> {
  const { db, round } = await context();
  const rows = await db.getAllAsync<WalletBalanceRow>(
    `SELECT wallets.id, wallets.name, wallets.color, wallets.icon, wallets.excluded, wallets.currency_code,
            wallets.currency_name, wallets.currency_symbol, wallets.currency_type,
            SUM(moves.amount) AS balance, SUM(moves.user) AS user_balance
     FROM wallets
     LEFT JOIN (
       SELECT wallet_to_id AS wallet_id, amount_to_amount AS amount, amount_user_amount AS user FROM operations
       WHERE deleted = 0 AND wallet_to_id IS NOT NULL
       UNION ALL
       SELECT wallet_from_id, -amount_from_amount, -amount_user_amount FROM operations
       WHERE deleted = 0 AND wallet_from_id IS NOT NULL
     ) AS moves ON moves.wallet_id = wallets.id
     WHERE wallets.deleted = 0
     GROUP BY wallets.id`,
  );
  return rows
    .map(row => {
      const currency: Currency = {
        code: row.currency_code,
        currency: row.currency_name,
        symbol: row.currency_symbol,
        type: row.currency_type,
      };
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        excluded: row.excluded === 1,
        currency,
        balance: roundHalfUp(row.balance ?? 0, decimalsOf(currency)),
        userBalance: round(row.user_balance ?? 0),
      };
    })
    .sort((a, b) => b.userBalance - a.userBalance);
}
