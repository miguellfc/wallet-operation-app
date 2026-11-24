import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/features/currencies/currency-api';
import type { WalletDetail, WalletDocument, WalletsData } from '@/features/wallets/wallets-api';
import type { NewWallet } from '@/features/wallets/wallet-form-api';
import type { WalletType } from '@/features/wallets/wallet-options';
import { ApiError } from '@/lib/api';

import { findOrCreateAdjustmentCategory } from './categories';
import { findLocalCurrency } from './currencies';
import { getDatabase } from './database';
import { convert, findRate, insertRate } from './exchange-rates';
import { newId } from './ids';
import { assertAmountDecimals, decimalsOf, notFound, roundHalfUp } from './money';
import {
  findOpening,
  hasActiveWalletOperations,
  insertOperation,
  removeOpening,
  userBalance,
  walletBalance,
  walletBalances,
  walletCounts,
  walletOperations,
  walletOperationsSince,
  type WalletSnapshot,
} from './operations';
import { requireProfile, type LocalProfile } from './profile';

type WalletRow = {
  id: string;
  name: string;
  type: WalletType;
  color: string;
  icon: string;
  excluded: number;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  currency_type: Currency['type'];
  init_amount: number;
  created_at: string;
};

export type WalletChanges = Partial<Omit<NewWallet, 'currency' | 'currencyType'>> & {
  currency?: string;
  currencyType?: Currency['type'];
};

const WALLET_COLUMNS =
  'id, name, type, color, icon, excluded, currency_code, currency_name, currency_symbol, currency_type, init_amount, created_at';

const currencyOf = (row: WalletRow): Currency => ({
  code: row.currency_code,
  currency: row.currency_name,
  symbol: row.currency_symbol,
  type: row.currency_type,
});

const toDocument = (row: WalletRow): WalletDocument => ({
  _id: row.id,
  name: row.name,
  type: row.type,
  icon: row.icon,
  color: row.color,
  excluded: row.excluded === 1,
  initAmount: row.init_amount,
  currency: currencyOf(row),
});

const snapshotOf = (row: WalletRow): WalletSnapshot => ({
  id: row.id,
  name: row.name,
  excluded: row.excluded === 1,
  currency: currencyOf(row),
});

async function findWalletRow(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<WalletRow>(`SELECT ${WALLET_COLUMNS} FROM wallets WHERE id = ? AND deleted = 0`, [
    id,
  ]);
  if (!row) throw notFound();
  return row;
}

async function listWalletRows(db: SQLiteDatabase) {
  return db.getAllAsync<WalletRow>(`SELECT ${WALLET_COLUMNS} FROM wallets WHERE deleted = 0 ORDER BY created_at, id`);
}

function resolveCurrency(code: string, type?: Currency['type']) {
  const currency = findLocalCurrency(code, type ?? 'FIAT');
  if (!currency) throw new ApiError(400, 'NON_EXISTENT_CURRENCY');
  return currency;
}

async function ensureExchangeRate(db: SQLiteDatabase, currency: Currency, profile: LocalProfile, exchangeRate?: number) {
  if (currency.code === profile.currency.code) return;
  if ((await findRate(db, currency.code, profile.currency.code)) !== null) return;
  if (exchangeRate === undefined) throw new ApiError(400, 'EXCHANGE_RATE_REQUIRED');
  await insertRate(db, currency, exchangeRate, profile.currency.code);
}

async function createOpening(db: SQLiteDatabase, wallet: WalletSnapshot, amount: number, date: string, profile: LocalProfile) {
  const conversion = await convert(db, amount, wallet.currency.code, profile.currency, profile.currency);
  await insertOperation(db, {
    type: 'OPENING',
    date,
    to: { wallet, amount },
    user: { currency: profile.currency.code, amount: conversion.baseAmount, rateTo: conversion.fromRate },
  });
}

export async function findWalletSnapshot(db: SQLiteDatabase, id: string) {
  return snapshotOf(await findWalletRow(db, id));
}

export async function localUserBalance(currency: Currency) {
  return userBalance(await getDatabase(), currency);
}

export async function getWallet(id: string) {
  return toDocument(await findWalletRow(await getDatabase(), id));
}

export async function listWallets(): Promise<WalletsData> {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const [rows, balances, total] = await Promise.all([
    listWalletRows(db),
    walletBalances(db),
    userBalance(db, profile.currency),
  ]);
  return {
    balance: total,
    currencyCode: profile.currency.code,
    wallets: rows.map(row => {
      const currency = currencyOf(row);
      const decimals = decimalsOf(currency);
      return {
        id: row.id,
        name: row.name,
        excluded: row.excluded === 1,
        icon: row.icon,
        color: row.color,
        currencyCode: currency.code,
        decimals,
        balance: roundHalfUp(balances.get(row.id) ?? 0, decimals),
      };
    }),
  };
}

export async function getWalletDetail(id: string, size: number): Promise<WalletDetail> {
  const db = await getDatabase();
  const row = await findWalletRow(db, id);
  const wallet = toDocument(row);
  const [balance, counts, rows, operations] = await Promise.all([
    walletBalance(db, { id, currency: wallet.currency }),
    walletCounts(db, id),
    listWalletRows(db),
    walletOperations(db, id, size + 1),
  ]);
  return {
    wallet,
    balance,
    decimals: decimalsOf(wallet.currency),
    counts,
    wallets: rows.map(item => ({ id: item.id, name: item.name, currencyCode: item.currency_code })),
    operations: operations.slice(0, size),
    hasMore: operations.length > size,
  };
}

export async function deleteWallet(id: string) {
  const db = await getDatabase();
  const row = await findWalletRow(db, id);
  if ((await walletBalance(db, { id, currency: currencyOf(row) })) !== 0) {
    throw new ApiError(409, 'WALLET_BALANCE_NOT_ZERO');
  }
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE wallets SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND deleted = 0', [
      now,
      now,
      id,
    ]);
    await removeOpening(db, id);
  });
}

export async function getWalletOperationsSince(id: string, from: string) {
  const db = await getDatabase();
  return walletOperationsSince(db, id, from);
}

export async function createWallet({ exchangeRate, ...input }: NewWallet) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const currency = resolveCurrency(input.currency, input.currencyType);
  if (input.initAmount > 0) assertAmountDecimals(input.initAmount, currency);
  const id = newId();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await ensureExchangeRate(db, currency, profile, exchangeRate);
    await db.runAsync(
      `INSERT INTO wallets (id, name, type, color, icon, excluded, currency_code, currency_name, currency_symbol, currency_type, init_amount, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.type,
        input.color,
        input.icon,
        input.excluded ? 1 : 0,
        currency.code,
        currency.currency,
        currency.symbol,
        currency.type,
        input.initAmount,
        now,
        now,
      ],
    );
    if (input.initAmount > 0) {
      const wallet = { id, name: input.name, excluded: input.excluded, currency };
      await createOpening(db, wallet, input.initAmount, now, profile);
    }
  });
  return { _id: id };
}

export async function updateWallet(id: string, { exchangeRate, currency: code, currencyType, ...changes }: WalletChanges) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const current = await findWalletRow(db, id);
  const currency = code ? resolveCurrency(code, currencyType) : currencyOf(current);
  const currencyChanged = currency.code !== current.currency_code;
  const initAmount = changes.initAmount ?? current.init_amount;
  const amountChanged = initAmount !== current.init_amount;

  if (currencyChanged && (await hasActiveWalletOperations(db, id))) throw new ApiError(409, 'WALLET_HAS_OPERATIONS');
  if (amountChanged && initAmount > 0) assertAmountDecimals(initAmount, currency);

  const next: WalletRow = {
    ...current,
    name: changes.name ?? current.name,
    type: changes.type ?? current.type,
    color: changes.color ?? current.color,
    icon: changes.icon ?? current.icon,
    excluded: changes.excluded === undefined ? current.excluded : changes.excluded ? 1 : 0,
    currency_code: currency.code,
    currency_name: currency.currency,
    currency_symbol: currency.symbol,
    currency_type: currency.type,
    init_amount: initAmount,
  };

  await db.withTransactionAsync(async () => {
    if (currencyChanged) await ensureExchangeRate(db, currency, profile, exchangeRate);
    const opening = await findOpening(db, id);
    const rebuild = initAmount > 0 && (currencyChanged || (amountChanged && !opening));

    await db.runAsync(
      `UPDATE wallets SET name = ?, type = ?, color = ?, icon = ?, excluded = ?, currency_code = ?, currency_name = ?,
         currency_symbol = ?, currency_type = ?, init_amount = ?, updated_at = ? WHERE id = ?`,
      [
        next.name,
        next.type,
        next.color,
        next.icon,
        next.excluded,
        next.currency_code,
        next.currency_name,
        next.currency_symbol,
        next.currency_type,
        next.init_amount,
        new Date().toISOString(),
        id,
      ],
    );

    if (rebuild) {
      await removeOpening(db, id);
      await createOpening(db, snapshotOf(next), initAmount, current.created_at, profile);
    } else if (initAmount === 0 && opening) {
      await removeOpening(db, id);
    } else if (amountChanged && opening) {
      const rate = opening.rate_to ?? 1;
      await db.runAsync(
        'UPDATE operations SET amount_to_amount = ?, amount_user_amount = ?, updated_at = ? WHERE id = ?',
        [initAmount, roundHalfUp(initAmount / rate, decimalsOf(profile.currency)), new Date().toISOString(), opening.id],
      );
    }
  });
  return { _id: id };
}

export async function adjustWalletBalance(id: string, balance: number, date: string) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const row = await findWalletRow(db, id);
  const wallet = snapshotOf(row);
  assertAmountDecimals(Math.abs(balance), wallet.currency);
  const remaining = roundHalfUp((await walletBalance(db, wallet)) - balance, decimalsOf(wallet.currency));
  if (remaining === 0) throw new ApiError(400, 'BALANCE_UNCHANGED');

  const isIncome = remaining < 0;
  const amount = Math.abs(remaining);
  let operationId = '';
  await db.withTransactionAsync(async () => {
    const category = await findOrCreateAdjustmentCategory(db, isIncome ? 'INCOME' : 'EXPENSE');
    const conversion = await convert(db, amount, wallet.currency.code, profile.currency, profile.currency);
    operationId = await insertOperation(db, {
      type: isIncome ? 'INCOME' : 'EXPENSE',
      date,
      description: 'Reajuste de saldo',
      ...(isIncome ? { to: { wallet, amount } } : { from: { wallet, amount } }),
      user: {
        currency: profile.currency.code,
        amount: conversion.baseAmount,
        ...(isIncome ? { rateTo: conversion.fromRate } : { rateFrom: conversion.fromRate }),
      },
      category: { id: category._id, name: category.name, color: category.color, icon: category.icon },
      adjustment: true,
    });
  });
  return { _id: operationId };
}
