import type { SQLiteDatabase } from 'expo-sqlite';

import type { Frequency, RecurrenceEnd } from '@/features/operations/recurrence-form-api';
import type { RecurrenceItem } from '@/features/wallets/wallets-api';
import { ApiError } from '@/lib/api';

import { getDatabase } from './database';
import { newId } from './ids';
import { notFound } from './money';
import {
  NEXT_EXECUTION,
  getNextExecution,
  isRecurrenceCompleted,
  toScheduleDay,
  type ScheduleConfiguration,
  type ScheduleEnd,
} from './next-execution';
import { buildAmount, buildCategory, buildWallets, isCategoryType } from './operation-builders';
import { insertOperation, OPERATION_COLUMNS, readOperationDraft, toOperation, type NewOperation } from './operations';
import { readProfile, type LocalProfile } from './profile';

export type RecurrencePayload = {
  recurrence: Frequency;
  configuration: {
    delay: number;
    end: { type: string; times?: number; until?: string };
    daysOfWeek?: number[];
    sameMonthDay?: boolean;
    lastMonthDay?: boolean;
  };
};

type RecurrenceRow = {
  id: string;
  recurrence: Frequency;
  delay: number;
  end_type: RecurrenceEnd;
  end_times: number | null;
  end_times_executed: number;
  end_until: string | null;
  days_of_week: string | null;
  same_month_day: number | null;
  last_month_day: number | null;
  start_date: string;
  next_execution: string | null;
};

const RECURRENCE_COLUMNS = `id, recurrence, delay, end_type, end_times, end_times_executed, end_until, days_of_week,
  same_month_day, last_month_day, start_date, next_execution`;

const configurationOf = (row: RecurrenceRow): ScheduleConfiguration => ({
  delay: row.delay,
  ...(row.days_of_week ? { daysOfWeek: JSON.parse(row.days_of_week) as number[] } : {}),
  ...(row.same_month_day !== null ? { sameMonthDay: row.same_month_day === 1 } : {}),
  ...(row.last_month_day !== null ? { lastMonthDay: row.last_month_day === 1 } : {}),
});

const endOf = (row: RecurrenceRow): ScheduleEnd => ({
  type: row.end_type,
  times: row.end_times ?? undefined,
  timesExecuted: row.end_times_executed,
  until: row.end_until ?? undefined,
});

const flag = (value?: boolean) => (value === undefined ? null : value ? 1 : 0);

export async function createLocalRecurrence(operationId: string, { recurrence, configuration }: RecurrencePayload) {
  const db = await getDatabase();
  const operation = await readOperationDraft(db, operationId);
  if (!operation) throw notFound();
  if (operation.debt) throw new ApiError(400, 'DEBT_OPERATION_NOT_RECURRENT');
  if (operation.type === 'OPENING') throw new ApiError(400, 'OPENING_OPERATION_NOT_RECURRENT');

  const end: ScheduleEnd = {
    type: configuration.end.type as RecurrenceEnd,
    times: configuration.end.times,
    timesExecuted: 0,
    until: configuration.end.until,
  };
  const startDate = toScheduleDay(operation.date).toDate();
  const nextExecution = getNextExecution({ recurrence, startDate, configuration }, startDate);
  const completed = isRecurrenceCompleted(end, nextExecution);
  const id = newId();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO recurrences (id, recurrence, delay, end_type, end_times, end_times_executed, end_until, days_of_week,
         same_month_day, last_month_day, start_date, last_execution, next_execution, completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        recurrence,
        configuration.delay,
        end.type ?? 'FOREVER',
        end.times ?? null,
        end.until ? toScheduleDay(end.until).toISOString() : null,
        configuration.daysOfWeek ? JSON.stringify(configuration.daysOfWeek) : null,
        flag(configuration.sameMonthDay),
        flag(configuration.lastMonthDay),
        startDate.toISOString(),
        startDate.toISOString(),
        completed ? null : nextExecution.toISOString(),
        completed ? 1 : 0,
        now,
        now,
      ],
    );
    await db.runAsync('INSERT INTO recurrence_operations (recurrence_id, operation_id, position) VALUES (?, ?, 0)', [
      id,
      operationId,
    ]);
  });
  return { _id: id };
}

export async function listLocalRecurrences(): Promise<RecurrenceItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<RecurrenceRow>(
    `SELECT ${RECURRENCE_COLUMNS} FROM recurrences WHERE deleted = 0 AND completed = 0
     ORDER BY next_execution IS NULL, next_execution, id`,
  );
  return Promise.all(
    rows.map(async row => {
      const links = await db.getAllAsync<{ operation_id: string }>(
        'SELECT operation_id FROM recurrence_operations WHERE recurrence_id = ? ORDER BY position',
        [row.id],
      );
      const template = await findTemplate(db, row.id);
      return {
        recurrence: {
          _id: row.id,
          recurrence: row.recurrence,
          nextExecution: row.next_execution,
          operations: links.map(link => link.operation_id),
        },
        ...(template ? { template: toOperation(template) } : {}),
      };
    }),
  );
}

async function findTemplate(db: SQLiteDatabase, recurrenceId: string) {
  return db.getFirstAsync<Parameters<typeof toOperation>[0]>(
    `SELECT ${OPERATION_COLUMNS.replace(/(^|,\s*)/g, '$1operations.')} FROM operations
     JOIN recurrence_operations ON recurrence_operations.operation_id = operations.id
     WHERE recurrence_operations.recurrence_id = ? AND operations.deleted = 0
     ORDER BY operations.date DESC, operations.id DESC LIMIT 1`,
    [recurrenceId],
  );
}

async function complete(db: SQLiteDatabase, id: string) {
  await db.runAsync('UPDATE recurrences SET completed = 1, next_execution = NULL, updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    id,
  ]);
}

async function prepareCopy(db: SQLiteDatabase, template: NewOperation, date: Date, profile: LocalProfile) {
  const sourceSide = template.type === 'INCOME' ? template.to : template.from;
  let references: Pick<NewOperation, 'category'> & { wallets: Awaited<ReturnType<typeof buildWallets>> };
  try {
    references = {
      wallets: await buildWallets(db, template.type, { from: template.from?.wallet.id, to: template.to?.wallet.id }),
      ...(isCategoryType(template.type) && template.category
        ? { category: await buildCategory(db, template.type, template.category.id) }
        : {}),
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
  const operation: NewOperation = {
    type: template.type,
    date: date.toISOString(),
    description: template.description,
    ...(await buildAmount(db, sourceSide!.amount, template.type, references.wallets, profile)),
    ...(references.category ? { category: references.category } : {}),
  };
  return operation;
}

async function processRecurrence(db: SQLiteDatabase, row: RecurrenceRow, now: Date, profile: LocalProfile) {
  let next: Date | null = row.next_execution ? new Date(row.next_execution) : null;
  if (!next || next > now) return 0;

  const templateRow = await findTemplate(db, row.id);
  const template = templateRow ? await readOperationDraft(db, templateRow.id) : null;
  if (!template) {
    await complete(db, row.id);
    return 0;
  }

  const start = toScheduleDay(row.start_date);
  const configuration = configurationOf(row);
  let timesExecuted = row.end_times_executed;
  let completed = false;
  let created = 0;

  while (next && next <= now && !completed) {
    const scheduled = next;
    const following: Date = NEXT_EXECUTION[row.recurrence](start, toScheduleDay(scheduled), configuration).toDate();
    const executed = timesExecuted + 1;
    const done = isRecurrenceCompleted({ ...endOf(row), timesExecuted: executed }, following);

    const copy = await prepareCopy(db, template, scheduled, profile);
    if (!copy) {
      await complete(db, row.id);
      break;
    }

    await db.withTransactionAsync(async () => {
      const operationId = await insertOperation(db, copy);
      await db.runAsync(
        `UPDATE recurrences SET last_execution = ?, next_execution = ?, completed = ?, end_times_executed = ?, updated_at = ?
         WHERE id = ?`,
        [
          scheduled.toISOString(),
          done ? null : following.toISOString(),
          done ? 1 : 0,
          executed,
          new Date().toISOString(),
          row.id,
        ],
      );
      await db.runAsync(
        `INSERT INTO recurrence_operations (recurrence_id, operation_id, position)
         VALUES (?, ?, (SELECT COUNT(*) FROM recurrence_operations WHERE recurrence_id = ?))`,
        [row.id, operationId, row.id],
      );
    });

    next = following;
    timesExecuted = executed;
    completed = done;
    created++;
  }
  return created;
}

let running: Promise<number> | null = null;

async function runDue(now: Date) {
  const profile = await readProfile();
  if (!profile) return 0;
  const db = await getDatabase();
  const rows = await db.getAllAsync<RecurrenceRow>(
    `SELECT ${RECURRENCE_COLUMNS} FROM recurrences
     WHERE deleted = 0 AND completed = 0 AND next_execution IS NOT NULL AND next_execution <= ? ORDER BY id`,
    [now.toISOString()],
  );
  let created = 0;
  for (const row of rows) {
    created += await processRecurrence(db, row, now, profile).catch(() => 0);
  }
  return created;
}

export function runDueRecurrences(now = new Date()) {
  running ??= runDue(now).finally(() => {
    running = null;
  });
  return running;
}
