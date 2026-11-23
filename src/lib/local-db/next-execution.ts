import Dayjs, { type Dayjs as DayjsDate } from 'dayjs';
import Utc from 'dayjs/plugin/utc';

import type { Frequency, RecurrenceEnd } from '@/features/operations/recurrence-form-api';

Dayjs.extend(Utc);

const MAX_CANDIDATES = 1000;

export type ScheduleConfiguration = {
  delay?: number;
  daysOfWeek?: number[];
  sameMonthDay?: boolean;
  lastMonthDay?: boolean;
};

export type ScheduleEnd = {
  type?: RecurrenceEnd;
  times?: number;
  timesExecuted?: number;
  until?: Date | string;
};

export type RecurrenceSchedule = {
  recurrence: Frequency;
  startDate: Date | string;
  configuration?: ScheduleConfiguration;
};

export type NextExecutionFn = (start: DayjsDate, after: DayjsDate, configuration: ScheduleConfiguration) => DayjsDate;

export const toScheduleDay = (date: Date | string): DayjsDate => Dayjs.utc(date).startOf('day');

const delayOf = ({ delay }: ScheduleConfiguration) => (delay && delay > 0 ? delay : 1);

const firstAfter = (after: DayjsDate, fromIndex: number, candidateAt: (index: number) => DayjsDate): DayjsDate => {
  for (let i = Math.max(0, fromIndex); i < fromIndex + MAX_CANDIDATES; i++) {
    const candidate = candidateAt(i);
    if (candidate.isAfter(after, 'day')) return candidate;
  }
  throw new Error(`No execution found after ${after.toISOString()}`);
};

const withDayOfMonth = (month: DayjsDate, day: number) => month.date(Math.min(day, month.daysInMonth()));

export const nextDaily: NextExecutionFn = (start, after, configuration) => {
  const delay = delayOf(configuration);
  return firstAfter(after, Math.floor(after.diff(start, 'day') / delay), i => start.add(i * delay, 'day'));
};

export const nextWeekly: NextExecutionFn = (start, after, configuration) => {
  const delay = delayOf(configuration);
  const days = [...new Set(configuration.daysOfWeek?.length ? configuration.daysOfWeek : [start.day()])].sort(
    (a, b) => a - b,
  );
  const firstWeek = start.startOf('week');
  const fromCycle = Math.floor(after.diff(firstWeek, 'week') / delay);

  return firstAfter(after, fromCycle * days.length, i =>
    firstWeek.add(Math.floor(i / days.length) * delay, 'week').add(days[i % days.length], 'day'),
  );
};

export const nextMonthly: NextExecutionFn = (start, after, configuration) => {
  const delay = delayOf(configuration);
  const firstMonth = start.startOf('month');
  const fromIndex = Math.floor(after.diff(firstMonth, 'month') / delay);

  return firstAfter(after, fromIndex, i => {
    const month = firstMonth.add(i * delay, 'month');
    return configuration.lastMonthDay ? month.endOf('month').startOf('day') : withDayOfMonth(month, start.date());
  });
};

export const nextYearly: NextExecutionFn = (start, after, configuration) => {
  const delay = delayOf(configuration);
  const firstMonth = start.startOf('month');
  const fromIndex = Math.floor(after.diff(firstMonth, 'year') / delay);

  return firstAfter(after, fromIndex, i => withDayOfMonth(firstMonth.add(i * delay, 'year'), start.date()));
};

export const NEXT_EXECUTION: Record<Frequency, NextExecutionFn> = {
  DAILY: nextDaily,
  WEEKLY: nextWeekly,
  MONTHLY: nextMonthly,
  YEARLY: nextYearly,
};

export const getNextExecution = (
  { recurrence, startDate, configuration = {} }: RecurrenceSchedule,
  after: Date | string,
): Date => NEXT_EXECUTION[recurrence](toScheduleDay(startDate), toScheduleDay(after), configuration).toDate();

export const isRecurrenceCompleted = (end: ScheduleEnd | undefined, nextExecution: Date): boolean => {
  switch (end?.type) {
    case 'TIMES':
      return (end.timesExecuted ?? 0) >= (end.times ?? 0);
    case 'UNTIL':
      return !end.until || toScheduleDay(nextExecution).isAfter(toScheduleDay(end.until), 'day');
    default:
      return false;
  }
};
