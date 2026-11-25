import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from './database';

type Row = Record<string, string | number | null>;

type Doc = Record<string, unknown>;

const FORMAT = { app: 'cashen', version: 1 } as const;

const TABLES_TO_CLEAR = [
  'recurrence_operations',
  'recurrences',
  'operations',
  'debts',
  'exchange_rates',
  'categories',
  'wallets',
  'profile',
];

export class InvalidBackupError extends Error {
  constructor() {
    super('INVALID_BACKUP');
  }
}

const compact = <T extends Doc>(doc: T) =>
  Object.fromEntries(Object.entries(doc).filter(([, value]) => value !== null && value !== undefined)) as T;

const bool = (value: unknown) => value === 1;

const flag = (value: unknown) => (value === undefined || value === null ? null : value ? 1 : 0);

const text = (value: unknown) => (value === undefined || value === null ? null : String(value));

const num = (value: unknown) => (value === undefined || value === null ? null : Number(value));

const currencyOf = (row: Row, prefix: string) =>
  row[`${prefix}_code`] === null
    ? undefined
    : {
        code: row[`${prefix}_code`],
        currency: row[`${prefix}_name`],
        symbol: row[`${prefix}_symbol`],
        type: row[`${prefix}_type`],
      };

const currencyColumns = (prefix: string, currency: unknown) => {
  const value = (currency ?? {}) as Doc;
  return {
    [`${prefix}_code`]: text(value.code),
    [`${prefix}_name`]: text(value.currency),
    [`${prefix}_symbol`]: text(value.symbol),
    [`${prefix}_type`]: text(value.type),
  };
};

const audit = (row: Row) =>
  compact({
    deleted: bool(row.deleted),
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

const auditColumns = (doc: Doc) => {
  const now = new Date().toISOString();
  return {
    deleted: doc.deleted ? 1 : 0,
    deleted_at: text(doc.deletedAt),
    created_at: text(doc.createdAt) ?? now,
    updated_at: text(doc.updatedAt) ?? now,
  };
};

const walletToDoc = (row: Row) =>
  compact({
    _id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    excluded: bool(row.excluded),
    currency: currencyOf(row, 'currency'),
    initAmount: row.init_amount,
    ...audit(row),
  });

const walletFromDoc = (doc: Doc) => ({
  id: text(doc._id),
  name: text(doc.name),
  type: text(doc.type),
  color: text(doc.color),
  icon: text(doc.icon),
  excluded: doc.excluded ? 1 : 0,
  ...currencyColumns('currency', doc.currency),
  init_amount: num(doc.initAmount) ?? 0,
  ...auditColumns(doc),
});

const categoryToDoc = (row: Row) =>
  compact({
    _id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    system: bool(row.system),
    ...audit(row),
  });

const categoryFromDoc = (doc: Doc) => ({
  id: text(doc._id),
  name: text(doc.name),
  type: text(doc.type),
  color: text(doc.color),
  icon: text(doc.icon),
  system: doc.system ? 1 : 0,
  ...auditColumns(doc),
});

const rateToDoc = (row: Row) =>
  compact({
    _id: row.id,
    currency: currencyOf(row, 'currency'),
    exchangeRate: row.exchange_rate,
    targetCurrency: row.target_currency,
    ...audit(row),
  });

const rateFromDoc = (doc: Doc) => ({
  id: text(doc._id),
  ...currencyColumns('currency', doc.currency),
  exchange_rate: num(doc.exchangeRate),
  target_currency: text(doc.targetCurrency),
  ...auditColumns(doc),
});

const debtToDoc = (row: Row) =>
  compact({
    _id: row.id,
    person: row.person,
    type: row.type,
    amount: row.amount,
    pending: row.pending,
    currency: currencyOf(row, 'currency'),
    wallet: { id: row.wallet_id, name: row.wallet_name },
    date: row.date,
    color: row.color,
    description: row.description,
    status: row.status,
    ...audit(row),
  });

const debtFromDoc = (doc: Doc) => {
  const wallet = (doc.wallet ?? {}) as Doc;
  return {
    id: text(doc._id),
    person: text(doc.person),
    type: text(doc.type),
    amount: num(doc.amount),
    pending: num(doc.pending),
    ...currencyColumns('currency', doc.currency),
    wallet_id: text(wallet.id),
    wallet_name: text(wallet.name),
    date: text(doc.date),
    color: text(doc.color),
    description: text(doc.description),
    status: text(doc.status) ?? 'PENDING',
    ...auditColumns(doc),
  };
};

const sideToDoc = (row: Row, side: 'from' | 'to') =>
  row[`wallet_${side}_id`] === null
    ? undefined
    : {
        id: row[`wallet_${side}_id`],
        name: row[`wallet_${side}_name`],
        excluded: bool(row[`wallet_${side}_excluded`]),
        currency: currencyOf(row, `wallet_${side}_currency`),
      };

const amountToDoc = (row: Row, side: 'from' | 'to') =>
  row[`amount_${side}_currency`] === null
    ? undefined
    : { currency: row[`amount_${side}_currency`], amount: row[`amount_${side}_amount`] };

const operationToDoc = (row: Row) =>
  compact({
    _id: row.id,
    type: row.type,
    date: row.date,
    description: row.description,
    amount: compact({
      from: amountToDoc(row, 'from'),
      to: amountToDoc(row, 'to'),
      user: {
        currency: row.amount_user_currency,
        amount: row.amount_user_amount,
        rate: compact({ from: row.amount_user_rate_from, to: row.amount_user_rate_to }),
      },
    }),
    category:
      row.category_id === null
        ? undefined
        : compact({ id: row.category_id, name: row.category_name, color: row.category_color, icon: row.category_icon }),
    wallets: compact({ from: sideToDoc(row, 'from'), to: sideToDoc(row, 'to') }),
    debt: row.debt_id === null ? undefined : { id: row.debt_id, action: row.debt_action, amount: row.debt_amount },
    adjustment: bool(row.adjustment) || undefined,
    ...audit(row),
  });

const sideColumns = (side: 'from' | 'to', wallets: Doc, amount: Doc) => {
  const wallet = (wallets[side] ?? null) as Doc | null;
  const value = (amount[side] ?? null) as Doc | null;
  return {
    [`wallet_${side}_id`]: text(wallet?.id),
    [`wallet_${side}_name`]: text(wallet?.name),
    [`wallet_${side}_excluded`]: wallet ? (wallet.excluded ? 1 : 0) : null,
    ...currencyColumns(`wallet_${side}_currency`, wallet?.currency),
    [`amount_${side}_currency`]: text(value?.currency),
    [`amount_${side}_amount`]: num(value?.amount),
  };
};

const operationFromDoc = (doc: Doc) => {
  const amount = (doc.amount ?? {}) as Doc;
  const user = (amount.user ?? {}) as Doc;
  const rate = (user.rate ?? {}) as Doc;
  const wallets = (doc.wallets ?? {}) as Doc;
  const category = (doc.category ?? null) as Doc | null;
  const debt = (doc.debt ?? null) as Doc | null;
  return {
    id: text(doc._id),
    type: text(doc.type),
    date: text(doc.date),
    description: text(doc.description),
    ...sideColumns('from', wallets, amount),
    ...sideColumns('to', wallets, amount),
    amount_user_currency: text(user.currency),
    amount_user_amount: num(user.amount),
    amount_user_rate_from: num(rate.from),
    amount_user_rate_to: num(rate.to),
    category_id: text(category?.id),
    category_name: text(category?.name),
    category_color: text(category?.color),
    category_icon: text(category?.icon),
    debt_id: text(debt?.id),
    debt_action: text(debt?.action),
    debt_amount: num(debt?.amount),
    adjustment: doc.adjustment ? 1 : 0,
    ...auditColumns(doc),
  };
};

const recurrenceToDoc = (row: Row, operations: string[]) =>
  compact({
    _id: row.id,
    recurrence: row.recurrence,
    configuration: compact({
      delay: row.delay,
      end: compact({
        type: row.end_type,
        times: row.end_times,
        timesExecuted: row.end_times_executed,
        until: row.end_until,
      }),
      daysOfWeek: row.days_of_week === null ? undefined : (JSON.parse(String(row.days_of_week)) as number[]),
      sameMonthDay: row.same_month_day === null ? undefined : bool(row.same_month_day),
      lastMonthDay: row.last_month_day === null ? undefined : bool(row.last_month_day),
    }),
    operations,
    startDate: row.start_date,
    lastExecution: row.last_execution,
    nextExecution: row.next_execution,
    completed: bool(row.completed),
    ...audit(row),
  });

const recurrenceFromDoc = (doc: Doc) => {
  const configuration = (doc.configuration ?? {}) as Doc;
  const end = (configuration.end ?? {}) as Doc;
  return {
    id: text(doc._id),
    recurrence: text(doc.recurrence),
    delay: num(configuration.delay) ?? 1,
    end_type: text(end.type) ?? 'FOREVER',
    end_times: num(end.times),
    end_times_executed: num(end.timesExecuted) ?? 0,
    end_until: text(end.until),
    days_of_week: Array.isArray(configuration.daysOfWeek) ? JSON.stringify(configuration.daysOfWeek) : null,
    same_month_day: flag(configuration.sameMonthDay),
    last_month_day: flag(configuration.lastMonthDay),
    start_date: text(doc.startDate),
    last_execution: text(doc.lastExecution) ?? text(doc.startDate),
    next_execution: text(doc.nextExecution),
    completed: doc.completed ? 1 : 0,
    ...auditColumns(doc),
  };
};

const all = (db: SQLiteDatabase, table: string) => db.getAllAsync<Row>(`SELECT * FROM ${table} ORDER BY rowid`);

export async function exportBackup() {
  const db = await getDatabase();
  const [profile, wallets, categories, rates, debts, operations, recurrences, links] = await Promise.all([
    db.getFirstAsync<Row>('SELECT * FROM profile WHERE id = 1'),
    all(db, 'wallets'),
    all(db, 'categories'),
    all(db, 'exchange_rates'),
    all(db, 'debts'),
    all(db, 'operations'),
    all(db, 'recurrences'),
    db.getAllAsync<Row>('SELECT recurrence_id, operation_id FROM recurrence_operations ORDER BY recurrence_id, position'),
  ]);
  if (!profile) throw new InvalidBackupError();
  const operationsOf = (id: unknown) =>
    links.filter(link => link.recurrence_id === id).map(link => String(link.operation_id));
  const backup = {
    ...FORMAT,
    exportedAt: new Date().toISOString(),
    user: compact({
      firstName: profile.first_name,
      lastName: profile.last_name,
      currency: currencyOf(profile, 'currency'),
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }),
    wallets: wallets.map(walletToDoc),
    categories: categories.map(categoryToDoc),
    currencyExchanges: rates.map(rateToDoc),
    debts: debts.map(debtToDoc),
    operations: operations.map(operationToDoc),
    recurrences: recurrences.map(row => recurrenceToDoc(row, operationsOf(row.id))),
  };
  return JSON.stringify(backup, null, 2);
}

async function insertRow(db: SQLiteDatabase, table: string, row: Record<string, string | number | null>) {
  const columns = Object.keys(row);
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map(column => row[column]),
  );
}

const listOf = (value: unknown) => {
  if (!Array.isArray(value)) throw new InvalidBackupError();
  return value as Doc[];
};

export function parseBackup(content: string) {
  let data: Doc;
  try {
    data = JSON.parse(content) as Doc;
  } catch {
    throw new InvalidBackupError();
  }
  if (!data || data.app !== FORMAT.app || data.version !== FORMAT.version) throw new InvalidBackupError();
  const user = (data.user ?? null) as Doc | null;
  const currency = (user?.currency ?? null) as Doc | null;
  if (!user?.firstName || !user.lastName || !currency?.code || !currency.type) throw new InvalidBackupError();
  return {
    user,
    wallets: listOf(data.wallets),
    categories: listOf(data.categories),
    currencyExchanges: listOf(data.currencyExchanges),
    debts: listOf(data.debts),
    operations: listOf(data.operations),
    recurrences: listOf(data.recurrences),
  };
}

export async function importBackup(content: string) {
  const backup = parseBackup(content);
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const table of TABLES_TO_CLEAR) await db.runAsync(`DELETE FROM ${table}`);
    await insertRow(db, 'profile', {
      id: 1,
      first_name: text(backup.user.firstName),
      last_name: text(backup.user.lastName),
      ...currencyColumns('currency', backup.user.currency),
      created_at: text(backup.user.createdAt) ?? now,
      updated_at: text(backup.user.updatedAt) ?? now,
    });
    for (const doc of backup.wallets) await insertRow(db, 'wallets', walletFromDoc(doc));
    for (const doc of backup.categories) await insertRow(db, 'categories', categoryFromDoc(doc));
    for (const doc of backup.currencyExchanges) await insertRow(db, 'exchange_rates', rateFromDoc(doc));
    for (const doc of backup.debts) await insertRow(db, 'debts', debtFromDoc(doc));
    for (const doc of backup.operations) await insertRow(db, 'operations', operationFromDoc(doc));
    for (const doc of backup.recurrences) {
      await insertRow(db, 'recurrences', recurrenceFromDoc(doc));
      const operations = Array.isArray(doc.operations) ? (doc.operations as unknown[]).map(String) : [];
      for (const [position, operationId] of operations.entries()) {
        await insertRow(db, 'recurrence_operations', {
          recurrence_id: text(doc._id),
          operation_id: operationId,
          position,
        });
      }
    }
  });
}
