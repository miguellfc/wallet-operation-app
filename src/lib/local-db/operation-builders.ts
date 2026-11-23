import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryType } from '@/features/categories/categories-api';
import type { OperationType } from '@/features/operations/operations-api';
import { ApiError } from '@/lib/api';

import { findCategory } from './categories';
import { convert } from './exchange-rates';
import { assertAmountDecimals, decimalsOf, roundHalfUp } from './money';
import { walletBalance, type NewOperation, type WalletSnapshot } from './operations';
import type { LocalProfile } from './profile';
import { findWalletSnapshot } from './wallets';

export type Wallets = { from?: WalletSnapshot; to?: WalletSnapshot };

export const USER_TYPES: OperationType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

export const isCategoryType = (type: OperationType): type is CategoryType => type === 'INCOME' || type === 'EXPENSE';

export async function buildWallets(db: SQLiteDatabase, type: OperationType, ids: { from?: string; to?: string }) {
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

export async function buildAmount(
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

export async function buildCategory(db: SQLiteDatabase, type: CategoryType, id: string) {
  const category = await findCategory(db, id, { type, system: false });
  return { id: category._id, name: category.name, color: category.color, icon: category.icon };
}

export async function assertSufficientBalance(db: SQLiteDatabase, operation: NewOperation, excludeId?: string) {
  if (!operation.from) return;
  const { wallet, amount } = operation.from;
  const balance = await walletBalance(db, wallet, excludeId);
  if (roundHalfUp(balance - amount, decimalsOf(wallet.currency)) < 0) throw new ApiError(400, 'INSUFFICIENT_BALANCE');
}
