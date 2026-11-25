import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/features/currencies/currency-api';
import type {
  DebtAction,
  DebtDetail,
  DebtDocument,
  DebtEditing,
  DebtType,
  NewDebt,
} from '@/features/debts/debt-form-api';
import type { OperationType } from '@/features/operations/operations-api';
import type { Debt } from '@/features/wallets/wallets-api';
import { ApiError } from '@/lib/api';

import { findLoanCategory } from './categories';
import { getDatabase } from './database';
import { convert } from './exchange-rates';
import { newId } from './ids';
import { decimalsOf, notFound, roundHalfUp } from './money';
import { assertSufficientBalance, buildAmount } from './operation-builders';
import {
  insertOperation,
  OPERATION_COLUMNS,
  softDeleteOperation,
  toOperation,
  writeOperation,
  type NewOperation,
  type WalletSnapshot,
} from './operations';
import { requireProfile, type LocalProfile } from './profile';
import { findWalletSnapshot } from './wallets';

type LinkAction = 'OPENING' | DebtAction;

const OPERATION_TYPE_BY_ACTION: Record<DebtType, Record<LinkAction, 'INCOME' | 'EXPENSE'>> = {
  LENT: { OPENING: 'EXPENSE', INCREASE: 'EXPENSE', PAYMENT: 'INCOME' },
  BORROWED: { OPENING: 'INCOME', INCREASE: 'INCOME', PAYMENT: 'EXPENSE' },
};

type DebtRow = {
  id: string;
  person: string;
  type: DebtType;
  amount: number;
  pending: number;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  currency_type: Currency['type'];
  wallet_id: string;
  wallet_name: string;
  date: string;
  color: string | null;
  description: string | null;
  status: DebtDocument['status'];
};

const DEBT_COLUMNS = `id, person, type, amount, pending, currency_code, currency_name, currency_symbol, currency_type,
  wallet_id, wallet_name, date, color, description, status`;

const toDocument = (row: DebtRow): DebtDocument => ({
  _id: row.id,
  person: row.person,
  type: row.type,
  amount: row.amount,
  pending: row.pending,
  currency: { code: row.currency_code, type: row.currency_type },
  wallet: { id: row.wallet_id, name: row.wallet_name },
  date: row.date,
  ...(row.color ? { color: row.color } : {}),
  ...(row.description ? { description: row.description } : {}),
  status: row.status,
});

const currencyOf = (row: DebtRow): Currency => ({
  code: row.currency_code,
  currency: row.currency_name,
  symbol: row.currency_symbol,
  type: row.currency_type,
});

const pendingNegative = () => new ApiError(400, 'DEBT_PENDING_NEGATIVE');

async function findDebtRow(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<DebtRow>(`SELECT ${DEBT_COLUMNS} FROM debts WHERE id = ? AND deleted = 0`, [id]);
  if (!row) throw notFound();
  return row;
}

async function loanCategory(db: SQLiteDatabase, type: 'INCOME' | 'EXPENSE') {
  const category = await findLoanCategory(db, type);
  if (!category) throw new ApiError(400, 'LOAN_CATEGORY_NOT_FOUND');
  return { id: category._id, name: category.name, color: category.color, icon: category.icon };
}

async function toDebtCurrency(db: SQLiteDatabase, amount: number, from: Currency, debt: Currency, profile: LocalProfile) {
  if (from.code === debt.code) return amount;
  return (await convert(db, amount, from.code, debt, profile.currency)).amount;
}

async function recalculate(db: SQLiteDatabase, debtId: string) {
  const row = await findDebtRow(db, debtId);
  const decimals = decimalsOf(currencyOf(row));
  const totals = await db.getFirstAsync<{ amount: number | null; paid: number | null }>(
    `SELECT SUM(CASE WHEN debt_action = 'PAYMENT' THEN 0 ELSE debt_amount END) AS amount,
            SUM(CASE WHEN debt_action = 'PAYMENT' THEN debt_amount ELSE 0 END) AS paid
     FROM operations WHERE deleted = 0 AND debt_id = ?`,
    [debtId],
  );
  const opening = await db.getFirstAsync<{ date: string; wallet_id: string; wallet_name: string }>(
    `SELECT date, COALESCE(wallet_from_id, wallet_to_id) AS wallet_id, COALESCE(wallet_from_name, wallet_to_name) AS wallet_name
     FROM operations WHERE deleted = 0 AND debt_id = ? AND debt_action = 'OPENING'`,
    [debtId],
  );
  const amount = roundHalfUp(totals?.amount ?? 0, decimals);
  const paid = totals?.paid ?? 0;
  const pending = roundHalfUp(amount - paid, decimals);
  const status = pending <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
  await db.runAsync(
    `UPDATE debts SET amount = ?, pending = ?, status = ?, date = COALESCE(?, date), wallet_id = COALESCE(?, wallet_id),
       wallet_name = COALESCE(?, wallet_name), updated_at = ? WHERE id = ?`,
    [
      amount,
      pending,
      status,
      opening?.date ?? null,
      opening?.wallet_id ?? null,
      opening?.wallet_name ?? null,
      new Date().toISOString(),
      debtId,
    ],
  );
  return pending;
}

async function buildDebtOperation(
  db: SQLiteDatabase,
  profile: LocalProfile,
  input: {
    type: OperationType;
    wallet: WalletSnapshot;
    amount: number;
    date: string;
    description?: string;
    link: { id: string; action: LinkAction; amount: number };
  },
) {
  const isExpense = input.type === 'EXPENSE';
  const wallets = isExpense ? { from: input.wallet } : { to: input.wallet };
  const operation: NewOperation = {
    type: input.type,
    date: input.date,
    description: input.description || undefined,
    ...(await buildAmount(db, input.amount, input.type, wallets, profile)),
    category: await loanCategory(db, isExpense ? 'EXPENSE' : 'INCOME'),
    debt: input.link,
  };
  await assertSufficientBalance(db, operation);
  return operation;
}

export async function listOpenDebts(): Promise<Debt[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DebtRow>(
    `SELECT ${DEBT_COLUMNS} FROM debts WHERE deleted = 0 AND status IN ('PENDING', 'PARTIAL') ORDER BY date DESC, id DESC`,
  );
  return rows.map(row => ({
    _id: row.id,
    person: row.person,
    type: row.type,
    pending: row.pending,
    ...(row.description ? { description: row.description } : {}),
    currency: { code: row.currency_code },
  }));
}

export async function getDebt(id: string) {
  return toDocument(await findDebtRow(await getDatabase(), id));
}

async function debtOperations(db: SQLiteDatabase, id: string, filter: string, limit: number) {
  const rows = await db.getAllAsync<Parameters<typeof toOperation>[0]>(
    `SELECT ${OPERATION_COLUMNS} FROM operations WHERE deleted = 0 AND debt_id = ? ${filter}
     ORDER BY date DESC, id DESC LIMIT ?`,
    [id, limit],
  );
  return rows.map(toOperation);
}

export async function getDebtDetail(id: string, size: number): Promise<DebtDetail> {
  const db = await getDatabase();
  const row = await findDebtRow(db, id);
  const operations = await debtOperations(db, id, '', size + 1);
  return {
    debt: toDocument(row),
    decimals: decimalsOf(currencyOf(row)),
    operations: operations.slice(0, size),
    hasMore: operations.length > size,
  };
}

export async function getDebtEditing(id: string): Promise<DebtEditing> {
  const db = await getDatabase();
  const row = await findDebtRow(db, id);
  const [opening] = await debtOperations(db, id, "AND debt_action = 'OPENING'", 1);
  if (!opening) throw new Error('debt opening not found');
  return { debt: toDocument(row), opening };
}

export async function createDebt(input: NewDebt) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  const id = newId();
  await db.withTransactionAsync(async () => {
    const wallet = await findWalletSnapshot(db, input.wallet);
    const opening = await buildDebtOperation(db, profile, {
      type: OPERATION_TYPE_BY_ACTION[input.type].OPENING,
      wallet,
      amount: input.amount,
      date: input.date,
      description: input.description,
      link: { id, action: 'OPENING', amount: input.amount },
    });
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO debts (id, person, type, amount, pending, currency_code, currency_name, currency_symbol, currency_type,
         wallet_id, wallet_name, date, color, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        id,
        input.person,
        input.type,
        input.amount,
        input.amount,
        wallet.currency.code,
        wallet.currency.currency,
        wallet.currency.symbol,
        wallet.currency.type,
        wallet.id,
        wallet.name,
        input.date,
        input.color ?? null,
        input.description || null,
        now,
        now,
      ],
    );
    await insertOperation(db, opening);
  });
  return { _id: id };
}

export async function addDebtOperation(
  id: string,
  input: { action: DebtAction; amount: number; wallet: string; date: string; description?: string },
) {
  const [db, profile] = await Promise.all([getDatabase(), requireProfile()]);
  let operationId = '';
  await db.withTransactionAsync(async () => {
    const debt = await findDebtRow(db, id);
    const wallet = await findWalletSnapshot(db, input.wallet);
    const debtAmount = await toDebtCurrency(db, input.amount, wallet.currency, currencyOf(debt), profile);
    const exceeds = () => new ApiError(400, 'DEBT_PAYMENT_EXCEEDS_PENDING');
    if (input.action === 'PAYMENT' && debtAmount > debt.pending) throw exceeds();
    const operation = await buildDebtOperation(db, profile, {
      type: OPERATION_TYPE_BY_ACTION[debt.type][input.action],
      wallet,
      amount: input.amount,
      date: input.date,
      description: input.description,
      link: { id, action: input.action, amount: debtAmount },
    });
    operationId = await insertOperation(db, operation);
    if ((await recalculate(db, id)) < 0) throw exceeds();
  });
  return { _id: operationId };
}

export async function updateDebt(
  id: string,
  changes: { person?: string; date?: string; color?: string; description?: string },
) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const debt = await findDebtRow(db, id);
    await db.runAsync(
      'UPDATE debts SET person = ?, date = ?, color = ?, description = ?, updated_at = ? WHERE id = ?',
      [
        changes.person ?? debt.person,
        changes.date ?? debt.date,
        changes.color ?? debt.color,
        changes.description === undefined ? debt.description : changes.description || null,
        new Date().toISOString(),
        id,
      ],
    );
    if (changes.date) {
      await db.runAsync(
        "UPDATE operations SET date = ?, updated_at = ? WHERE deleted = 0 AND debt_id = ? AND debt_action = 'OPENING'",
        [changes.date, new Date().toISOString(), id],
      );
    }
  });
  return { _id: id };
}

async function removeDebtRows(db: SQLiteDatabase, id: string) {
  await findDebtRow(db, id);
  const now = new Date().toISOString();
  await db.runAsync('UPDATE debts SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
  await db.runAsync(
    'UPDATE operations SET deleted = 1, deleted_at = ?, updated_at = ? WHERE deleted = 0 AND debt_id = ?',
    [now, now, id],
  );
}

export async function deleteDebt(id: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(() => removeDebtRows(db, id));
}

export async function removeDebtOperation(db: SQLiteDatabase, operationId: string, link: NonNullable<NewOperation['debt']>) {
  if (link.action === 'OPENING') {
    await removeDebtRows(db, link.id);
    return;
  }
  await softDeleteOperation(db, operationId);
  if ((await recalculate(db, link.id)) < 0) throw pendingNegative();
}

export async function updateDebtOperation(
  db: SQLiteDatabase,
  operationId: string,
  next: NewOperation,
  options: { amountChanged: boolean; dateChanged: boolean },
  profile: LocalProfile,
) {
  const link = next.debt!;
  if (options.amountChanged) {
    const debt = await findDebtRow(db, link.id);
    const side = next.type === 'EXPENSE' ? next.from! : next.to!;
    const debtCurrency = currencyOf(debt);
    if (link.action === 'OPENING' && side.wallet.currency.code !== debtCurrency.code) {
      throw new ApiError(400, 'DEBT_WALLET_CURRENCY_MISMATCH');
    }
    next.debt = { ...link, amount: await toDebtCurrency(db, side.amount, side.wallet.currency, debtCurrency, profile) };
  }
  await writeOperation(db, operationId, next);
  if ((options.amountChanged || options.dateChanged) && (await recalculate(db, link.id)) < 0) throw pendingNegative();
}
