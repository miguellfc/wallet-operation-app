import { authRequest } from '@/features/auth/auth-request';
import type { Operation } from '@/features/operations/operations-api';
import {
  periodRange,
  type CategoryComparison,
  type CategoryRef,
  type PeriodRange,
  type StatsPeriod,
} from '@/features/statistics/statistics-api';
import { loadWalletDetail, type WalletDocument } from '@/features/wallets/wallets-api';
import { isLocal } from '@/lib/data-source';
import { getWalletOperationsSince } from '@/lib/local-db/wallets';

export type FlowPoint = { label: string; income: number; expense: number };

export type TransferTotal = { wallet: string; amount: number; count: number };

export type WalletTotals = { income: number; expense: number; incomeCount: number; expenseCount: number };

export type WalletStatistics = {
  key: string;
  wallet: WalletDocument;
  range: PeriodRange;
  previous: PeriodRange;
  closingBalance: number;
  previousClosing: number;
  current: WalletTotals;
  changes: { income: number | null; expense: number | null };
  savingsRate: number | null;
  evolution: { period: string; balance: number }[];
  evolutionInterval: 'DAY' | 'MONTH';
  flow: FlowPoint[];
  categories: CategoryComparison[];
  transfers: { incoming: TransferTotal[]; outgoing: TransferTotal[] };
  dailyAverage: number;
  biggestExpense: { description?: string; date: string; category: CategoryRef; amount: number } | null;
  busiestDay: { date: string; amount: number } | null;
};

type Entry = { operation: Operation; day: string; signed: number; amount: number; incoming: boolean };

const SEARCH_SIZE = 200;

const MAX_PAGES = 50;

const SHORT_WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (value: number) => String(value).padStart(2, '0');

const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isoDay = (key: string) => `${key}T00:00:00.000Z`;

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const round = (value: number) => Math.round(value * 100) / 100;

const change = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

function periodEnd(kind: StatsPeriod, start: Date) {
  if (kind === 'WEEK') return addDays(start, 6);
  if (kind === 'MONTH') return new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return new Date(start.getFullYear(), 11, 31);
}

function entryOf(operation: Operation, walletId: string): Entry {
  const incoming = operation.wallets.to?.id === walletId;
  const side = incoming ? operation.amount.to : operation.amount.from;
  const amount = (side ?? operation.amount.user).amount;
  return { operation, day: operation.date.slice(0, 10), signed: incoming ? amount : -amount, amount, incoming };
}

function totalsOf(entries: Entry[]): WalletTotals {
  const totals = { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 };
  for (const entry of entries) {
    if (entry.operation.type === 'OPENING') continue;
    if (entry.incoming) {
      totals.income += entry.amount;
      totals.incomeCount += 1;
    } else {
      totals.expense += entry.amount;
      totals.expenseCount += 1;
    }
  }
  return { ...totals, income: round(totals.income), expense: round(totals.expense) };
}

function categoriesOf(current: Entry[], previous: Entry[]): CategoryComparison[] {
  const kinds = ['INCOME', 'EXPENSE'] as const;
  const result: CategoryComparison[] = [];
  for (const type of kinds) {
    const sum = (entries: Entry[]) => {
      const map = new Map<string, { category: CategoryRef; total: number }>();
      for (const entry of entries) {
        const category = entry.operation.category;
        if (entry.operation.type !== type || !category) continue;
        const item = map.get(category.id) ?? { category, total: 0 };
        item.total += entry.amount;
        map.set(category.id, item);
      }
      return map;
    };
    const now = sum(current);
    const before = sum(previous);
    for (const { category, total } of now.values()) {
      const previousTotal = round(before.get(category.id)?.total ?? 0);
      result.push({ type, category, total: round(total), previousTotal, change: change(total, previousTotal) });
    }
  }
  return result.sort((a, b) => b.total - a.total);
}

function transfersOf(entries: Entry[]) {
  const group = (incoming: boolean) => {
    const map = new Map<string, TransferTotal>();
    for (const entry of entries) {
      if (entry.operation.type !== 'TRANSFER' || entry.incoming !== incoming) continue;
      const other = incoming ? entry.operation.wallets.from : entry.operation.wallets.to;
      const name = other?.name ?? 'Otra billetera';
      const item = map.get(name) ?? { wallet: name, amount: 0, count: 0 };
      item.amount += entry.amount;
      item.count += 1;
      map.set(name, item);
    }
    return [...map.values()].map(item => ({ ...item, amount: round(item.amount) })).sort((a, b) => b.amount - a.amount);
  };
  return { incoming: group(true), outgoing: group(false) };
}

function flowOf(kind: StatsPeriod, start: Date, entries: Entry[]): FlowPoint[] {
  const buckets: FlowPoint[] = [];
  let bucketOf: (day: string) => number;
  if (kind === 'WEEK') {
    SHORT_WEEKDAYS.forEach(label => buckets.push({ label, income: 0, expense: 0 }));
    const keys = SHORT_WEEKDAYS.map((_, index) => dayKey(addDays(start, index)));
    bucketOf = day => keys.indexOf(day);
  } else if (kind === 'MONTH') {
    const days = periodEnd(kind, start).getDate();
    const weeks = Math.ceil(days / 7);
    for (let index = 0; index < weeks; index += 1) buckets.push({ label: `S${index + 1}`, income: 0, expense: 0 });
    bucketOf = day => Math.min(Math.floor((Number(day.slice(8, 10)) - 1) / 7), weeks - 1);
  } else {
    SHORT_MONTHS.forEach(label => buckets.push({ label, income: 0, expense: 0 }));
    bucketOf = day => Number(day.slice(5, 7)) - 1;
  }
  for (const entry of entries) {
    if (entry.operation.type === 'OPENING') continue;
    const index = bucketOf(entry.day);
    if (index < 0 || index >= buckets.length) continue;
    if (entry.incoming) buckets[index].income += entry.amount;
    else buckets[index].expense += entry.amount;
  }
  return buckets.map(item => ({ ...item, income: round(item.income), expense: round(item.expense) }));
}

function evolutionOf(kind: StatsPeriod, range: PeriodRange, opening: number, entries: Entry[]) {
  const net = new Map<string, number>();
  for (const entry of entries) {
    const key = kind === 'YEAR' ? entry.day.slice(0, 7) : entry.day;
    net.set(key, (net.get(key) ?? 0) + entry.signed);
  }
  const points: { period: string; balance: number }[] = [];
  let balance = opening;
  if (kind === 'YEAR') {
    for (let month = range.start.getMonth(); month <= range.end.getMonth(); month += 1) {
      const key = `${range.start.getFullYear()}-${pad(month + 1)}`;
      balance += net.get(key) ?? 0;
      points.push({ period: isoDay(`${key}-01`), balance: round(balance) });
    }
  } else {
    for (let day = range.start; day.getTime() <= range.end.getTime(); day = addDays(day, 1)) {
      const key = dayKey(day);
      balance += net.get(key) ?? 0;
      points.push({ period: isoDay(key), balance: round(balance) });
    }
  }
  return points;
}

export function buildWalletStatistics(
  kind: StatsPeriod,
  offset: number,
  wallet: WalletDocument,
  balanceNow: number,
  operations: Operation[],
): WalletStatistics {
  const range = periodRange(kind, offset);
  const previous = periodRange(kind, offset - 1);
  const startKey = dayKey(range.start);
  const endKey = dayKey(range.end);
  const previousStartKey = dayKey(previous.start);
  const entries = operations.map(operation => entryOf(operation, wallet._id));
  const current = entries.filter(entry => entry.day >= startKey && entry.day <= endKey);
  const before = entries.filter(entry => entry.day >= previousStartKey && entry.day < startKey);
  const after = entries.filter(entry => entry.day > endKey);
  const closingBalance = round(balanceNow - after.reduce((sum, entry) => sum + entry.signed, 0));
  const currentNet = current.reduce((sum, entry) => sum + entry.signed, 0);
  const previousClosing = round(closingBalance - currentNet);
  const totals = totalsOf(current);
  const previousTotals = totalsOf(before);
  const expenses = current.filter(entry => entry.operation.type === 'EXPENSE');
  const biggest = expenses.reduce<Entry | null>((top, entry) => (!top || entry.amount > top.amount ? entry : top), null);
  const byDay = new Map<string, number>();
  for (const entry of current) {
    if (entry.incoming || entry.operation.type === 'OPENING') continue;
    byDay.set(entry.day, (byDay.get(entry.day) ?? 0) + entry.amount);
  }
  const busiest = [...byDay.entries()].reduce<[string, number] | null>(
    (top, item) => (!top || item[1] > top[1] ? item : top),
    null,
  );
  const days = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1;

  return {
    key: `${wallet._id}:${kind}:${offset}`,
    wallet,
    range,
    previous,
    closingBalance,
    previousClosing,
    current: totals,
    changes: { income: change(totals.income, previousTotals.income), expense: change(totals.expense, previousTotals.expense) },
    savingsRate: totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : null,
    evolution: evolutionOf(kind, range, previousClosing, current),
    evolutionInterval: kind === 'YEAR' ? 'MONTH' : 'DAY',
    flow: flowOf(kind, range.start, current),
    categories: categoriesOf(current, before),
    transfers: transfersOf(current),
    dailyAverage: round(totals.expense / Math.max(days, 1)),
    biggestExpense:
      biggest && biggest.operation.category
        ? {
            description: biggest.operation.description,
            date: biggest.operation.date,
            category: biggest.operation.category,
            amount: biggest.amount,
          }
        : null,
    busiestDay: busiest ? { date: isoDay(busiest[0]), amount: round(busiest[1]) } : null,
  };
}

async function walletOperationsSince(id: string, from: string) {
  if (isLocal) return getWalletOperationsSince(id, from);
  const operations: Operation[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await authRequest<{ data: Operation[] }>('/operations/search', {
      method: 'POST',
      body: {
        filters: { $or: [{ 'wallets.from.id': id }, { 'wallets.to.id': id }], date: { $gte: from } },
        sort: { date: -1 },
        page,
        size: SEARCH_SIZE,
      },
    });
    operations.push(...result.data);
    if (result.data.length < SEARCH_SIZE) break;
  }
  return operations;
}

export async function loadWalletStatistics(id: string, kind: StatsPeriod, offset: number) {
  const previous = periodRange(kind, offset - 1);
  const from = isoDay(dayKey(previous.start));
  const [detail, operations] = await Promise.all([loadWalletDetail(id, 1), walletOperationsSince(id, from)]);
  return buildWalletStatistics(kind, offset, detail.wallet, detail.balance, operations);
}
