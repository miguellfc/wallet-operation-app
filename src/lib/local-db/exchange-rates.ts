import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/features/currencies/currency-api';
import type { ExchangeRate } from '@/features/currencies/exchange-api';
import { ApiError } from '@/lib/api';

import { getDatabase } from './database';
import { newId } from './ids';
import { decimalsOf, notFound, roundHalfUp } from './money';
import { requireProfile } from './profile';

type RateRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  currency_type: Currency['type'];
  exchange_rate: number;
  target_currency: string;
};

const RATE_COLUMNS = 'id, currency_code, currency_name, currency_symbol, currency_type, exchange_rate, target_currency';

const toRate = (row: RateRow): ExchangeRate => ({
  _id: row.id,
  currency: { code: row.currency_code, currency: row.currency_name, symbol: row.currency_symbol, type: row.currency_type },
  exchangeRate: row.exchange_rate,
  targetCurrency: row.target_currency,
});

const duplicateRate = () => new ApiError(409, 'CURRENCY_EXCHANGE_ALREADY_EXISTS');

export async function listRates() {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const rows = await db.getAllAsync<RateRow>(
    `SELECT ${RATE_COLUMNS} FROM exchange_rates WHERE deleted = 0 AND target_currency = ? ORDER BY currency_code`,
    [profile.currency.code],
  );
  return rows.map(toRate);
}

export async function findRate(db: SQLiteDatabase, code: string, target: string) {
  const row = await db.getFirstAsync<{ exchange_rate: number }>(
    'SELECT exchange_rate FROM exchange_rates WHERE deleted = 0 AND target_currency = ? AND currency_code = ?',
    [target, code],
  );
  return row?.exchange_rate ?? null;
}

export async function insertRate(db: SQLiteDatabase, currency: Currency, exchangeRate: number, target: string) {
  if ((await findRate(db, currency.code, target)) !== null) throw duplicateRate();
  const id = newId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO exchange_rates (id, currency_code, currency_name, currency_symbol, currency_type, exchange_rate, target_currency, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, currency.code, currency.currency, currency.symbol, currency.type, exchangeRate, target, now, now],
  );
  return { _id: id };
}

export async function createRate(currency: Currency, exchangeRate: number) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  return insertRate(db, currency, exchangeRate, profile.currency.code);
}

export async function updateRate(id: string, exchangeRate: number) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE exchange_rates SET exchange_rate = ?, updated_at = ? WHERE id = ? AND deleted = 0',
    [exchangeRate, new Date().toISOString(), id],
  );
  if (result.changes === 0) throw notFound();
  return { _id: id };
}

export async function deleteRate(id: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'UPDATE exchange_rates SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND deleted = 0',
    [now, now, id],
  );
  if (result.changes === 0) throw notFound();
}

export type Conversion = { amount: number; baseAmount: number; fromRate: number; toRate: number };

export async function convert(
  db: SQLiteDatabase,
  amount: number,
  from: string,
  to: { code: string; type?: string },
  base: { code: string; type?: string },
): Promise<Conversion> {
  const rateOf = async (code: string) => (code === base.code ? 1 : findRate(db, code, base.code));
  const [fromRate, toRate] = await Promise.all([rateOf(from), rateOf(to.code)]);
  if (fromRate === null || toRate === null) throw notFound();
  return {
    fromRate,
    toRate,
    baseAmount: roundHalfUp(amount / fromRate, decimalsOf(base)),
    amount: roundHalfUp((amount / fromRate) * toRate, decimalsOf(to)),
  };
}
