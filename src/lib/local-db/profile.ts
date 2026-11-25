import type { Currency } from '@/features/currencies/currency-api';
import { ApiError } from '@/lib/api';

import { getDatabase } from './database';
import { DEFAULT_CATEGORIES } from './defaults';
import { newId } from './ids';
import { decimalsOf } from './money';

export type LocalProfile = { firstName: string; lastName: string; currency: Currency };

type ProfileRow = {
  first_name: string;
  last_name: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  currency_type: Currency['type'];
};

const toProfile = (row: ProfileRow): LocalProfile => ({
  firstName: row.first_name,
  lastName: row.last_name,
  currency: { code: row.currency_code, currency: row.currency_name, symbol: row.currency_symbol, type: row.currency_type },
});

export async function readProfile() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT first_name, last_name, currency_code, currency_name, currency_symbol, currency_type FROM profile WHERE id = 1',
  );
  return row ? toProfile(row) : null;
}

export async function createProfile({ firstName, lastName, currency }: LocalProfile) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const currencyValues = [currency.code, currency.currency, currency.symbol, currency.type];
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO profile (id, first_name, last_name, currency_code, currency_name, currency_symbol, currency_type, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, ...currencyValues, now, now],
    );
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, color, system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newId(), category.name, category.type, category.color, category.system ? 1 : 0, now, now],
      );
    }
  });
  return { firstName, lastName, currency };
}

/**
 * Changes the base currency. It needs an active rate of the new currency against the current one, and with that
 * rate (new units per current unit) moves every operation's user amount and every exchange rate to the new base,
 * in one transaction.
 */
export async function changeProfileCurrency(currency: Currency) {
  const db = await getDatabase();
  const profile = await requireProfile();
  const from = profile.currency;
  if (from.code === currency.code) throw new ApiError(400, 'CURRENCY_UNCHANGED');

  const rate = await db.getFirstAsync<{ exchange_rate: number }>(
    'SELECT exchange_rate FROM exchange_rates WHERE deleted = 0 AND target_currency = ? AND currency_code = ?',
    [from.code, currency.code],
  );
  if (!rate) throw new ApiError(400, 'EXCHANGE_RATE_REQUIRED');
  const factor = rate.exchange_rate;
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE operations
       SET amount_user_currency = ?,
           amount_user_amount = ROUND(amount_user_amount * ?, ?),
           amount_user_rate_from = amount_user_rate_from / ?,
           amount_user_rate_to = amount_user_rate_to / ?
       WHERE amount_user_currency = ?`,
      [currency.code, factor, decimalsOf(currency), factor, factor, from.code],
    );
    await db.runAsync(
      `UPDATE exchange_rates SET deleted = 1, deleted_at = ?, updated_at = ?
       WHERE deleted = 0 AND target_currency = ? AND currency_code = ?`,
      [now, now, from.code, currency.code],
    );
    await db.runAsync(
      `UPDATE exchange_rates SET exchange_rate = exchange_rate / ?, target_currency = ?, updated_at = ?
       WHERE target_currency = ? AND currency_code <> ?`,
      [factor, currency.code, now, from.code, currency.code],
    );
    await db.runAsync(
      `INSERT INTO exchange_rates (id, currency_code, currency_name, currency_symbol, currency_type, exchange_rate, target_currency, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), from.code, from.currency, from.symbol, from.type, 1 / factor, currency.code, now, now],
    );
    await db.runAsync(
      `UPDATE profile SET currency_code = ?, currency_name = ?, currency_symbol = ?, currency_type = ?, updated_at = ?
       WHERE id = 1`,
      [currency.code, currency.currency, currency.symbol, currency.type, now],
    );
  });
  return { ...profile, currency };
}

export async function requireProfile() {
  const profile = await readProfile();
  if (!profile) throw new Error('LOCAL_PROFILE_MISSING');
  return profile;
}
