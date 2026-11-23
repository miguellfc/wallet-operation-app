import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryType } from '@/features/categories/categories-api';
import type { NewOperation as OperationInput } from '@/features/operations/operation-form-api';
import type { OperationType, RangeOperations } from '@/features/operations/operations-api';
import { ApiError } from '@/lib/api';

import { findCategory } from './categories';
import { currencyByCode } from './currencies';
import { getDatabase } from './database';
import { convert } from './exchange-rates';
import { assertAmountDecimals, decimalsOf, notFound, roundHalfUp } from './money';
import {
  findOperation,
  insertOperation,
  rangeIncomeExpense,
  rangeOperations,
  readOperationDraft,
  softDeleteOperation,
  userBalance,
  walletBalance,
  writeOperation,
  type NewOperation,
  type WalletSnapshot,
} from './operations';
import { requireProfile, type LocalProfile } from './profile';
import { findWalletSnapshot } from './wallets';

type Wallets = { from?: WalletSnapshot; to?: WalletSnapshot };

const USER_TYPES: OperationType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

const isCategoryType = (type: OperationType): type is CategoryType => type === 'INCOME' || type === 'EXPENSE';

async function buildWallets(db: SQLiteDatabase, type: OperationType, ids: { from?: string; to?: string }) {
  const wallets: Wallets = {};
  if (type === 'EXPENSE' || type === 'TRANSFER') {
    if (!ids.from) throw new ApiError(400, 'FROM_WALLET_REQUIRED');
    wallets.from = await findWalletSnapshot(db, ids.from);
  }
  if (type === 'INCOME' || type === 'TRANSFER') {
    if (!ids.to) throw new ApiError(400, 'TO_WALLET_REQUIRED');
    wallets.to = await findWalletSnapshot(db, ids.to);
  }
  if (type === 'TRANSFER' && wallets.from?.id === wallets.to?.id) throw new ApiError(400, 'TRANSFER_SAME_WALLET');
  return wallets;
}

async function buildAmount(
  db: SQLiteDatabase,
  amount: number,
  type: OperationType,
  wallets: Wallets,
  profile: LocalProfile,
): Promise<Pick<NewOperation, 'from' | 'to' | 'user'>> {
  const sourceSide = type === 'INCOME' ? 'to' : 'from';
  const source = wallets[sourceSide]!;
  assertAmountDecimals(amount, source.currency);
  const transfer = type === 'TRANSFER';
  const target = transfer ? wallets.to!.currency : profile.currency;
  const conversion = await convert(db, amount, source.currency.code, target, profile.currency);
  const user = { currency: profile.currency.code, amount: conversion.baseAmount };
  if (transfer) {
    return {
      from: { wallet: source, amount },
      to: { wallet: wallets.to!, amount: conversion.amount },
      user: { ...user, rateFrom: conversion.fromRate, rateTo: conversion.toRate },
    };
  }
  return sourceSide === 'to'
    ? { to: { wallet: source, amount }, user: { ...user, rateTo: conversion.fromRate } }
    : { from: { wallet: source, amount }, user: { ...user, rateFrom: conversion.fromRate } };
}

async function buildCategory(db: SQLiteDatabase, type: CategoryType, id: string) {
  const category = await findCategory(db, id, { type, system: false });
  return { id: category._id, name: category.name, color: category.color, icon: category.icon };
}

async function assertSufficientBalance(db: SQLiteDatabase, operation: NewOperation, excludeId?: string) {
  if (!operation.from) return;
  const { wallet, amount } = operation.from;
  const balance = await walletBalance(db, wallet, excludeId);
  if (roundHalfUp(balance - amount, decimalsOf(wallet.currency)) < 0) throw new ApiError(400, 'INSUFFICIENT_BALANCE');
}

const inputAmount = (operation: NewOperation, type: OperationType) =>
  (type === 'INCOME' ? (operation.to ?? operation.from) : (operation.from ?? operation.to))!.amount;

export async function createLocalOperation(input: OperationInput) {
  if (!USER_TYPES.includes(input.type)) throw new ApiError(400, 'INVALID_OPERATION_TYPE');
  if (isCategoryType(input.type) && !input.category) throw new ApiError(400, 'CATEGORY_REQUIRED');
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  let id = '';
  await db.withTransactionAsync(async () => {
    const wallets = await buildWallets(db, input.type, input);
    const operation: NewOperation = {
      type: input.type,
      date: input.date,
      description: input.description?.trim() || undefined,
      ...(await buildAmount(db, input.amount, input.type, wallets, profile)),
      ...(isCategoryType(input.type) ? { category: await buildCategory(db, input.type, input.category!) } : {}),
    };
    await assertSufficientBalance(db, operation);
    id = await insertOperation(db, operation);
  });
  return { _id: id };
}

export async function updateLocalOperation(id: string, changes: Partial<OperationInput>) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  await db.withTransactionAsync(async () => {
    const current = await readOperationDraft(db, id);
    if (!current) throw notFound();
    if (current.type === 'OPENING') throw new ApiError(400, 'OPENING_OPERATION_LOCKED');
    if (current.debt) throw new ApiError(400, 'DEBT_OPERATION_LOCKED');

    const type = changes.type ?? current.type;
    const typeChanged = type !== current.type;
    if (typeChanged && isCategoryType(type) && !changes.category) throw new ApiError(400, 'CATEGORY_REQUIRED');

    const next: NewOperation = {
      ...current,
      type,
      date: changes.date ?? current.date,
      description: changes.description === undefined ? current.description : changes.description.trim() || undefined,
    };

    if (!isCategoryType(type)) next.category = undefined;
    else if (changes.category) next.category = await buildCategory(db, type, changes.category);

    const walletsChanged = typeChanged || Boolean(changes.from || changes.to);
    const wallets = walletsChanged
      ? await buildWallets(db, type, {
          from: changes.from ?? current.from?.wallet.id,
          to: changes.to ?? current.to?.wallet.id,
        })
      : { from: current.from?.wallet, to: current.to?.wallet };

    if (changes.amount !== undefined || walletsChanged) {
      const amount = changes.amount ?? inputAmount(current, type);
      const built = await buildAmount(db, amount, type, wallets, profile);
      next.from = built.from;
      next.to = built.to;
      next.user = built.user;
      await assertSufficientBalance(db, next, id);
    }

    await writeOperation(db, id, next);
  });
  return { _id: id };
}

export async function deleteLocalOperation(id: string) {
  const db = await getDatabase();
  const current = await readOperationDraft(db, id);
  if (!current) throw notFound();
  if (current.type === 'OPENING') throw new ApiError(400, 'OPENING_OPERATION_LOCKED');
  if (current.debt) throw new ApiError(400, 'DEBT_OPERATION_LOCKED');
  await softDeleteOperation(db, id);
}

export async function getLocalOperation(id: string) {
  const operation = await findOperation(await getDatabase(), id);
  if (!operation) throw notFound();
  return operation;
}

export async function convertLocalAmount(amount: number, from: string, to: string) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const target = currencyByCode(to) ?? { code: to };
  const conversion = await convert(db, amount, from, target, profile.currency);
  return { amount: conversion.amount, currency: to };
}

export async function loadLocalRange(
  bounds: { from: string; to: string },
  size: number,
): Promise<Omit<RangeOperations, 'firstName'>> {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const decimals = decimalsOf(profile.currency);
  const [closingBalance, totals, operations] = await Promise.all([
    userBalance(db, profile.currency, bounds.to),
    rangeIncomeExpense(db, bounds.from, bounds.to),
    rangeOperations(db, bounds.from, bounds.to, size + 1),
  ]);
  return {
    currency: profile.currency,
    closingBalance,
    income: roundHalfUp(totals.income, decimals),
    expense: roundHalfUp(totals.expense, decimals),
    operations: operations.slice(0, size),
    hasMore: operations.length > size,
  };
}
