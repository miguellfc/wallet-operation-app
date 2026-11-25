import type { Currency } from '@/features/currencies/currency-api';

import { getDatabase } from './database';
import { DEFAULT_CATEGORIES, DEFAULT_WALLET } from './defaults';
import { newId } from './ids';

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
    await db.runAsync(
      `INSERT INTO wallets (id, name, type, color, icon, excluded, currency_code, currency_name, currency_symbol, currency_type, init_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        DEFAULT_WALLET.name,
        DEFAULT_WALLET.type,
        DEFAULT_WALLET.color,
        DEFAULT_WALLET.icon,
        DEFAULT_WALLET.excluded ? 1 : 0,
        ...currencyValues,
        DEFAULT_WALLET.initAmount,
        now,
        now,
      ],
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

export async function requireProfile() {
  const profile = await readProfile();
  if (!profile) throw new Error('LOCAL_PROFILE_MISSING');
  return profile;
}
