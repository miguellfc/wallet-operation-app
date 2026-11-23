const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const full = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
const rounded = new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 });

export function formatNumber(amount: number, compact = false) {
  return `${amount < 0 ? '-' : ''}${(compact ? rounded : full).format(Math.abs(amount))}`;
}

export function formatAmount(amount: number, currencyCode: string, sign = '', compact = false) {
  const prefix = sign || (amount < 0 ? '-' : '');
  return `${prefix}${(compact ? rounded : full).format(Math.abs(amount))} ${currencyCode}`;
}

export function monthLabel(isoDate: string) {
  return MONTHS[new Date(isoDate).getUTCMonth()];
}

type Interval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const SHORT_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function periodLabel(isoDate: string, interval: Interval) {
  const date = new Date(isoDate);
  if (interval === 'DAY') return SHORT_WEEKDAYS[date.getUTCDay()];
  if (interval === 'WEEK') return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
  if (interval === 'MONTH') return MONTHS[date.getUTCMonth()];
  return String(date.getUTCFullYear());
}

export function utcDateLabel(isoDate: string) {
  const date = new Date(isoDate);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function periodTitle(isoDate: string, interval: Interval) {
  const date = new Date(isoDate);
  if (interval === 'DAY') return utcDateLabel(isoDate);
  if (interval === 'WEEK') return `Semana del ${utcDateLabel(isoDate)}`;
  if (interval === 'MONTH') return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  return String(date.getUTCFullYear());
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function dayLabel(day: Date, now = new Date()) {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const prefix = sameDay(day, now) ? 'Hoy' : sameDay(day, yesterday) ? 'Ayer' : WEEKDAYS[day.getDay()];
  return `${prefix}, ${day.getDate()} ${MONTHS[day.getMonth()]}`;
}

export function rangeLabel(from: Date, to: Date, now = new Date()) {
  if (sameDay(from, to)) return dayLabel(from, now);
  const withYear = from.getFullYear() !== to.getFullYear() || to.getFullYear() !== now.getFullYear();
  const part = (date: Date) => `${date.getDate()} ${MONTHS[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ''}`;
  return `${part(from)} – ${part(to)}`;
}

const LONG_WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function longDayLabel(isoDate: string) {
  const date = new Date(isoDate);
  return `${LONG_WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const CRYPTO_DECIMALS = 8;

export function currencyDecimals(code: string, type?: string) {
  if (type === 'CRYPTO') return CRYPTO_DECIMALS;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

const pad = (value: number) => String(value).padStart(2, '0');

const clock = (hours: number, minutes: number) => `${pad(hours % 12 || 12)}:${pad(minutes)} ${hours < 12 ? 'AM' : 'PM'}`;

export function timeLabel(isoDate: string) {
  const date = new Date(isoDate);
  return clock(date.getUTCHours(), date.getUTCMinutes());
}

export function clockLabel(date: Date) {
  return clock(date.getHours(), date.getMinutes());
}

export function shortDateLabel(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${String(date.getFullYear()).slice(-2)}`;
}

export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
