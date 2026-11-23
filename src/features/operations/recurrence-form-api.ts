import { authRequest } from '@/features/auth/auth-request';
import type { Operation } from '@/features/operations/operations-api';
import { isLocal } from '@/lib/data-source';
import { currencyDecimals, roundTo } from '@/lib/format';
import {
  createLocalRecurrence,
  deleteLocalRecurrence,
  getLocalRecurrence,
  updateLocalRecurrence,
} from '@/lib/local-db/recurrences';

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceEnd = 'FOREVER' | 'TIMES' | 'UNTIL';

export type RecurrenceDraft = {
  frequency: Frequency;
  delay: number;
  daysOfWeek: number[];
  lastMonthDay: boolean;
  end: RecurrenceEnd;
  times: number;
  until: Date;
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const WEEKDAY_NAMES = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

const EVERY: Record<Frequency, string> = {
  DAILY: 'todos los días',
  WEEKLY: 'cada semana',
  MONTHLY: 'cada mes',
  YEARLY: 'cada año',
};

const UNITS: Record<Frequency, [string, string]> = {
  DAILY: ['día', 'días'],
  WEEKLY: ['semana', 'semanas'],
  MONTHLY: ['mes', 'meses'],
  YEARLY: ['año', 'años'],
};

const SHORT: Record<Frequency, string> = { DAILY: 'Diaria', WEEKLY: 'Semanal', MONTHLY: 'Mensual', YEARLY: 'Anual' };

const SHORT_UNITS: Record<Frequency, string> = { DAILY: 'días', WEEKLY: 'sem.', MONTHLY: 'meses', YEARLY: 'años' };

export const unitLabel = (frequency: Frequency, count: number) => UNITS[frequency][count === 1 ? 0 : 1];

export function defaultRecurrence(start: Date): RecurrenceDraft {
  return {
    frequency: 'MONTHLY',
    delay: 1,
    daysOfWeek: [start.getDay()],
    lastMonthDay: false,
    end: 'FOREVER',
    times: 1,
    until: new Date(start.getFullYear(), start.getMonth() + 1, start.getDate()),
  };
}

const joinNames = (names: string[]) =>
  names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

const dateText = (date: Date) => `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export function recurrenceShortLabel(draft: RecurrenceDraft) {
  return draft.delay === 1 ? SHORT[draft.frequency] : `Cada ${draft.delay} ${SHORT_UNITS[draft.frequency]}`;
}

export function recurrenceSummary(draft: RecurrenceDraft, start: Date) {
  const every = draft.delay === 1 ? EVERY[draft.frequency] : `cada ${draft.delay} ${unitLabel(draft.frequency, draft.delay)}`;
  let detail = '';
  if (draft.frequency === 'WEEKLY') {
    const ordered = [1, 2, 3, 4, 5, 6, 0].filter(day => draft.daysOfWeek.includes(day));
    detail = ` los ${joinNames(ordered.map(day => WEEKDAY_NAMES[day]))}`;
  } else if (draft.frequency === 'MONTHLY') {
    detail = draft.lastMonthDay ? ', el último día del mes' : `, el día ${start.getDate()}`;
  } else if (draft.frequency === 'YEARLY') {
    detail = `, el ${start.getDate()} de ${MONTHS[start.getMonth()]}`;
  }
  const end =
    draft.end === 'TIMES'
      ? `, ${draft.times} ${draft.times === 1 ? 'vez' : 'veces'} más`
      : draft.end === 'UNTIL'
        ? `, hasta el ${dateText(draft.until)}`
        : ', sin fecha de fin';
  return `Se repetirá ${every}${detail}${end}.`;
}

function toPayload(draft: RecurrenceDraft) {
  const end =
    draft.end === 'TIMES'
      ? { type: 'TIMES', times: draft.times }
      : draft.end === 'UNTIL'
        ? {
            type: 'UNTIL',
            until: new Date(
              Date.UTC(draft.until.getFullYear(), draft.until.getMonth(), draft.until.getDate()),
            ).toISOString(),
          }
        : { type: 'FOREVER' };
  return {
    recurrence: draft.frequency,
    configuration: {
      delay: draft.delay,
      end,
      ...(draft.frequency === 'WEEKLY' && { daysOfWeek: draft.daysOfWeek }),
      ...(draft.frequency === 'MONTHLY' && { sameMonthDay: !draft.lastMonthDay, lastMonthDay: draft.lastMonthDay }),
    },
  };
}

export async function createRecurrence(operationId: string, draft: RecurrenceDraft) {
  if (isLocal) return createLocalRecurrence(operationId, toPayload(draft));
  return authRequest<{ _id: string }>('/recurrences', {
    method: 'POST',
    body: { operation: operationId, ...toPayload(draft) },
  });
}

export type RecurrenceDocument = {
  _id: string;
  recurrence: Frequency;
  configuration: {
    delay?: number;
    end?: { type?: RecurrenceEnd; times?: number; timesExecuted?: number; until?: string };
    daysOfWeek?: number[];
    sameMonthDay?: boolean;
    lastMonthDay?: boolean;
  };
  operations: string[];
  startDate: string;
  lastExecution: string;
  nextExecution: string | null;
  completed: boolean;
};

export type RecurrenceDetail = {
  recurrence: RecurrenceDocument;
  template?: Operation;
  originalId?: string;
  operations: Operation[];
  hasMore: boolean;
  total: { amount: number; currency: string } | null;
};

const PAGE_SIZE = 200;

const utcDay = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const recurrenceStart = (recurrence: RecurrenceDocument) => utcDay(recurrence.startDate);

export function draftFromRecurrence(recurrence: RecurrenceDocument): RecurrenceDraft {
  const start = recurrenceStart(recurrence);
  const { configuration } = recurrence;
  const end = configuration.end ?? {};
  const fallback = defaultRecurrence(start);
  return {
    frequency: recurrence.recurrence,
    delay: configuration.delay ?? 1,
    daysOfWeek: configuration.daysOfWeek?.length ? configuration.daysOfWeek : [start.getDay()],
    lastMonthDay: !!configuration.lastMonthDay,
    end: end.type ?? 'FOREVER',
    times: end.times ?? fallback.times,
    until: end.until ? utcDay(end.until) : fallback.until,
  };
}

function buildDetail(recurrence: RecurrenceDocument, operations: Operation[], size: number): RecurrenceDetail {
  const currency = operations[0]?.amount.user.currency;
  const sum = operations.reduce((total, operation) => total + operation.amount.user.amount, 0);
  const original = recurrence.operations[0];
  return {
    recurrence,
    template: operations[0],
    originalId: original,
    operations: operations.slice(0, size),
    hasMore: operations.length > size,
    total: currency ? { amount: roundTo(sum, currencyDecimals(currency)), currency } : null,
  };
}

export async function loadRecurrenceDetail(id: string, size: number): Promise<RecurrenceDetail> {
  if (isLocal) {
    const { recurrence, operations } = await getLocalRecurrence(id);
    return buildDetail(recurrence, operations, size);
  }
  const recurrence = await authRequest<RecurrenceDocument>(`/recurrences/${id}`);
  if (recurrence.operations.length === 0) return buildDetail(recurrence, [], size);
  const page = await authRequest<{ data: Operation[] }>('/operations/search', {
    method: 'POST',
    body: { filters: { _id: { $in: recurrence.operations } }, sort: { date: -1 }, size: PAGE_SIZE },
  });
  return buildDetail(recurrence, page.data, size);
}

export async function updateRecurrence(id: string, draft: RecurrenceDraft) {
  if (isLocal) return updateLocalRecurrence(id, toPayload(draft));
  return authRequest<{ _id: string }>(`/recurrences/${id}`, { method: 'PATCH', body: toPayload(draft) });
}

export async function deleteRecurrence(id: string) {
  if (isLocal) return deleteLocalRecurrence(id);
  return authRequest<unknown>(`/recurrences/${id}`, { method: 'DELETE' });
}
