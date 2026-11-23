import type { NewOperation as OperationInput } from '@/features/operations/operation-form-api';
import type { OperationType, RangeOperations } from '@/features/operations/operations-api';
import { ApiError } from '@/lib/api';

import { currencyByCode } from './currencies';
import { removeDebtOperation, updateDebtOperation } from './debts';
import { getDatabase } from './database';
import { convert } from './exchange-rates';
import { decimalsOf, notFound, roundHalfUp } from './money';
import {
  assertSufficientBalance,
  buildAmount,
  buildCategory,
  buildWallets,
  isCategoryType,
  USER_TYPES,
} from './operation-builders';
import {
  findOperation,
  insertOperation,
  rangeIncomeExpense,
  rangeOperations,
  readOperationDraft,
  softDeleteOperation,
  userBalance,
  writeOperation,
  type NewOperation,
} from './operations';
import { requireProfile } from './profile';

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

    const type = changes.type ?? current.type;
    const typeChanged = type !== current.type;
    if (current.debt && typeChanged) throw new ApiError(400, 'DEBT_OPERATION_TYPE_LOCKED');
    if (current.debt && changes.category) throw new ApiError(400, 'DEBT_OPERATION_CATEGORY_LOCKED');
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

    const amountChanged = changes.amount !== undefined || walletsChanged;
    if (amountChanged) {
      const amount = changes.amount ?? inputAmount(current, type);
      const built = await buildAmount(db, amount, type, wallets, profile);
      next.from = built.from;
      next.to = built.to;
      next.user = built.user;
      if (!current.debt) await assertSufficientBalance(db, next, id);
    }

    if (current.debt) {
      const dateChanged = current.debt.action === 'OPENING' && changes.date !== undefined;
      await updateDebtOperation(db, id, next, { amountChanged, dateChanged }, profile);
      return;
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
  if (current.debt) {
    const link = current.debt;
    await db.withTransactionAsync(() => removeDebtOperation(db, id, link));
    return;
  }
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
