import type { SQLiteDatabase } from 'expo-sqlite';

import type { Currency } from '@/features/currencies/currency-api';
import type { Operation, OperationType } from '@/features/operations/operations-api';

import { newId } from './ids';
import { decimalsOf, roundHalfUp } from './money';

export type WalletSnapshot = { id: string; name: string; excluded: boolean; currency: Currency };

export type CategorySnapshot = { id: string; name: string; color: string; icon?: string };

export type NewOperation = {
  type: OperationType;
  date: string;
  description?: string;
  from?: { wallet: WalletSnapshot; amount: number };
  to?: { wallet: WalletSnapshot; amount: number };
  user: { currency: string; amount: number; rateFrom?: number; rateTo?: number };
  category?: CategorySnapshot;
  debt?: { id: string; action: 'OPENING' | 'PAYMENT' | 'INCREASE'; amount: number };
  adjustment?: boolean;
};

type OperationRow = {
  id: string;
  type: OperationType;
  date: string;
  description: string | null;
  wallet_from_id: string | null;
  wallet_from_name: string | null;
  wallet_from_currency_code: string | null;
  amount_from_currency: string | null;
  amount_from_amount: number | null;
  wallet_to_id: string | null;
  wallet_to_name: string | null;
  wallet_to_currency_code: string | null;
  amount_to_currency: string | null;
  amount_to_amount: number | null;
  amount_user_currency: string;
  amount_user_amount: number;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  debt_id: string | null;
  debt_action: 'OPENING' | 'PAYMENT' | 'INCREASE' | null;
  debt_amount: number | null;
};

export const OPERATION_COLUMNS = `id, type, date, description,
  wallet_from_id, wallet_from_name, wallet_from_currency_code, amount_from_currency, amount_from_amount,
  wallet_to_id, wallet_to_name, wallet_to_currency_code, amount_to_currency, amount_to_amount,
  amount_user_currency, amount_user_amount, category_id, category_name, category_color, category_icon,
  debt_id, debt_action, debt_amount`;

const side = (id: string | null, name: string | null, code: string | null) =>
  id ? { id, name: name ?? '', ...(code ? { currency: { code } } : {}) } : undefined;

const sideAmount = (currency: string | null, amount: number | null) =>
  currency !== null && amount !== null ? { currency, amount } : undefined;

export function toOperation(row: OperationRow): Operation {
  return {
    _id: row.id,
    type: row.type,
    date: row.date,
    ...(row.description ? { description: row.description } : {}),
    amount: {
      from: sideAmount(row.amount_from_currency, row.amount_from_amount),
      to: sideAmount(row.amount_to_currency, row.amount_to_amount),
      user: { currency: row.amount_user_currency, amount: row.amount_user_amount },
    },
    ...(row.category_id
      ? {
          category: {
            id: row.category_id,
            name: row.category_name ?? '',
            ...(row.category_color ? { color: row.category_color } : {}),
            ...(row.category_icon ? { icon: row.category_icon } : {}),
          },
        }
      : {}),
    wallets: {
      from: side(row.wallet_from_id, row.wallet_from_name, row.wallet_from_currency_code),
      to: side(row.wallet_to_id, row.wallet_to_name, row.wallet_to_currency_code),
    },
    ...(row.debt_id && row.debt_action && row.debt_amount !== null
      ? { debt: { id: row.debt_id, action: row.debt_action, amount: row.debt_amount } }
      : {}),
  };
}

const walletValues = (entry?: { wallet: WalletSnapshot; amount: number }) =>
  entry
    ? [
        entry.wallet.id,
        entry.wallet.name,
        entry.wallet.excluded ? 1 : 0,
        entry.wallet.currency.code,
        entry.wallet.currency.currency,
        entry.wallet.currency.symbol,
        entry.wallet.currency.type,
        entry.wallet.currency.code,
        entry.amount,
      ]
    : [null, null, null, null, null, null, null, null, null];

const WRITE_COLUMNS = [
  'type',
  'date',
  'description',
  'wallet_from_id',
  'wallet_from_name',
  'wallet_from_excluded',
  'wallet_from_currency_code',
  'wallet_from_currency_name',
  'wallet_from_currency_symbol',
  'wallet_from_currency_type',
  'amount_from_currency',
  'amount_from_amount',
  'wallet_to_id',
  'wallet_to_name',
  'wallet_to_excluded',
  'wallet_to_currency_code',
  'wallet_to_currency_name',
  'wallet_to_currency_symbol',
  'wallet_to_currency_type',
  'amount_to_currency',
  'amount_to_amount',
  'amount_user_currency',
  'amount_user_amount',
  'amount_user_rate_from',
  'amount_user_rate_to',
  'category_id',
  'category_name',
  'category_color',
  'category_icon',
  'debt_id',
  'debt_action',
  'debt_amount',
  'adjustment',
];

const writeValues = (operation: NewOperation) => [
  operation.type,
  operation.date,
  operation.description ?? null,
  ...walletValues(operation.from),
  ...walletValues(operation.to),
  operation.user.currency,
  operation.user.amount,
  operation.user.rateFrom ?? null,
  operation.user.rateTo ?? null,
  operation.category?.id ?? null,
  operation.category?.name ?? null,
  operation.category?.color ?? null,
  operation.category?.icon ?? null,
  operation.debt?.id ?? null,
  operation.debt?.action ?? null,
  operation.debt?.amount ?? null,
  operation.adjustment ? 1 : 0,
];

export async function insertOperation(db: SQLiteDatabase, operation: NewOperation) {
  const id = newId();
  const now = new Date().toISOString();
  const columns = ['id', ...WRITE_COLUMNS, 'created_at', 'updated_at'];
  await db.runAsync(
    `INSERT INTO operations (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    [id, ...writeValues(operation), now, now],
  );
  return id;
}

export async function writeOperation(db: SQLiteDatabase, id: string, operation: NewOperation) {
  await db.runAsync(
    `UPDATE operations SET ${WRITE_COLUMNS.map(column => `${column} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
    [...writeValues(operation), new Date().toISOString(), id],
  );
}

type DraftRow = Record<string, string | number | null>;

const text = (row: DraftRow, column: string) => (row[column] === null ? undefined : String(row[column]));

const num = (row: DraftRow, column: string) => (row[column] === null ? undefined : Number(row[column]));

function draftSide(row: DraftRow, side: 'from' | 'to') {
  const id = text(row, `wallet_${side}_id`);
  const amount = num(row, `amount_${side}_amount`);
  if (!id || amount === undefined) return undefined;
  return {
    amount,
    wallet: {
      id,
      name: text(row, `wallet_${side}_name`) ?? '',
      excluded: row[`wallet_${side}_excluded`] === 1,
      currency: {
        code: text(row, `wallet_${side}_currency_code`) ?? '',
        currency: text(row, `wallet_${side}_currency_name`) ?? '',
        symbol: text(row, `wallet_${side}_currency_symbol`) ?? '',
        type: (text(row, `wallet_${side}_currency_type`) ?? 'FIAT') as Currency['type'],
      },
    },
  };
}

export async function readOperationDraft(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<DraftRow>(
    `SELECT id, ${WRITE_COLUMNS.join(', ')} FROM operations WHERE id = ? AND deleted = 0`,
    [id],
  );
  if (!row) return null;
  const categoryId = text(row, 'category_id');
  const debtId = text(row, 'debt_id');
  const draft: NewOperation = {
    type: row.type as OperationType,
    date: String(row.date),
    description: text(row, 'description'),
    from: draftSide(row, 'from'),
    to: draftSide(row, 'to'),
    user: {
      currency: String(row.amount_user_currency),
      amount: Number(row.amount_user_amount),
      rateFrom: num(row, 'amount_user_rate_from'),
      rateTo: num(row, 'amount_user_rate_to'),
    },
    category: categoryId
      ? {
          id: categoryId,
          name: text(row, 'category_name') ?? '',
          color: text(row, 'category_color') ?? '',
          icon: text(row, 'category_icon'),
        }
      : undefined,
    debt: debtId
      ? {
          id: debtId,
          action: text(row, 'debt_action') as 'OPENING' | 'PAYMENT' | 'INCREASE',
          amount: num(row, 'debt_amount') ?? 0,
        }
      : undefined,
    adjustment: row.adjustment === 1,
  };
  return draft;
}

export async function softDeleteOperation(db: SQLiteDatabase, id: string) {
  const now = new Date().toISOString();
  await db.runAsync('UPDATE operations SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ? AND deleted = 0', [
    now,
    now,
    id,
  ]);
}

export async function findOperation(db: SQLiteDatabase, id: string) {
  const row = await db.getFirstAsync<OperationRow>(
    `SELECT ${OPERATION_COLUMNS} FROM operations WHERE id = ? AND deleted = 0`,
    [id],
  );
  return row ? toOperation(row) : null;
}

export async function rangeOperations(db: SQLiteDatabase, from: string, to: string, limit: number) {
  const rows = await db.getAllAsync<OperationRow>(
    `SELECT ${OPERATION_COLUMNS} FROM operations
     WHERE deleted = 0 AND date >= ? AND date <= ?
     ORDER BY date DESC, id DESC LIMIT ?`,
    [from, to, limit],
  );
  return rows.map(toOperation);
}

export async function rangeIncomeExpense(db: SQLiteDatabase, from: string, to: string) {
  const row = await db.getFirstAsync<{ income: number | null; expense: number | null }>(
    `SELECT SUM(CASE WHEN type = 'INCOME' THEN amount_user_amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'EXPENSE' THEN amount_user_amount ELSE 0 END) AS expense
     FROM operations
     WHERE deleted = 0 AND type IN ('INCOME', 'EXPENSE') AND debt_id IS NULL AND adjustment = 0
       AND date >= ? AND date <= ?`,
    [from, to],
  );
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}

export async function removeOpening(db: SQLiteDatabase, walletId: string) {
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE operations SET deleted = 1, deleted_at = ?, updated_at = ? WHERE deleted = 0 AND type = 'OPENING' AND wallet_to_id = ?",
    [now, now, walletId],
  );
}

export async function findOpening(db: SQLiteDatabase, walletId: string) {
  return db.getFirstAsync<{ id: string; rate_to: number | null }>(
    "SELECT id, amount_user_rate_to AS rate_to FROM operations WHERE deleted = 0 AND type = 'OPENING' AND wallet_to_id = ?",
    [walletId],
  );
}

export async function hasActiveWalletOperations(db: SQLiteDatabase, walletId: string) {
  const row = await db.getFirstAsync(
    "SELECT 1 FROM operations WHERE deleted = 0 AND type <> 'OPENING' AND (wallet_from_id = ? OR wallet_to_id = ?) LIMIT 1",
    [walletId, walletId],
  );
  return row !== null;
}

export async function walletBalance(
  db: SQLiteDatabase,
  wallet: { id: string; currency: Currency },
  excludeId?: string,
) {
  const row = await db.getFirstAsync<{ balance: number | null }>(
    `SELECT SUM(CASE WHEN wallet_to_id = ?1 THEN amount_to_amount ELSE 0 END)
          - SUM(CASE WHEN wallet_from_id = ?1 THEN amount_from_amount ELSE 0 END) AS balance
     FROM operations WHERE deleted = 0 AND (wallet_to_id = ?1 OR wallet_from_id = ?1) AND id <> ?2`,
    [wallet.id, excludeId ?? ''],
  );
  return roundHalfUp(row?.balance ?? 0, decimalsOf(wallet.currency));
}

export async function walletBalances(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ wallet_id: string; balance: number }>(
    `SELECT wallet_id, SUM(amount) AS balance FROM (
       SELECT wallet_to_id AS wallet_id, amount_to_amount AS amount FROM operations WHERE deleted = 0 AND wallet_to_id IS NOT NULL
       UNION ALL
       SELECT wallet_from_id, -amount_from_amount FROM operations WHERE deleted = 0 AND wallet_from_id IS NOT NULL
     ) GROUP BY wallet_id`,
  );
  return new Map(rows.map(row => [row.wallet_id, row.balance]));
}

export async function userBalance(db: SQLiteDatabase, currency: Currency, until?: string) {
  const row = await db.getFirstAsync<{ balance: number | null }>(
    `SELECT SUM(moves.amount) AS balance FROM (
       SELECT wallet_to_id AS wallet_id, amount_user_amount AS amount FROM operations
       WHERE deleted = 0 AND wallet_to_id IS NOT NULL AND (?1 IS NULL OR date <= ?1)
       UNION ALL
       SELECT wallet_from_id, -amount_user_amount FROM operations
       WHERE deleted = 0 AND wallet_from_id IS NOT NULL AND (?1 IS NULL OR date <= ?1)
     ) AS moves
     JOIN wallets ON wallets.id = moves.wallet_id AND wallets.deleted = 0 AND wallets.excluded = 0`,
    [until ?? null],
  );
  return roundHalfUp(row?.balance ?? 0, decimalsOf(currency));
}

export async function walletCounts(db: SQLiteDatabase, walletId: string) {
  const row = await db.getFirstAsync<{ income: number; expense: number; transfer: number }>(
    `SELECT COALESCE(SUM(type = 'INCOME'), 0) AS income, COALESCE(SUM(type = 'EXPENSE'), 0) AS expense,
            COALESCE(SUM(type = 'TRANSFER'), 0) AS transfer
     FROM operations WHERE deleted = 0 AND type <> 'OPENING' AND (wallet_from_id = ?1 OR wallet_to_id = ?1)`,
    [walletId],
  );
  return row ?? { income: 0, expense: 0, transfer: 0 };
}

export async function walletOperations(db: SQLiteDatabase, walletId: string, limit: number) {
  const rows = await db.getAllAsync<OperationRow>(
    `SELECT ${OPERATION_COLUMNS} FROM operations
     WHERE deleted = 0 AND (wallet_from_id = ?1 OR wallet_to_id = ?1)
     ORDER BY date DESC, id DESC LIMIT ?2`,
    [walletId, limit],
  );
  return rows.map(toOperation);
}
