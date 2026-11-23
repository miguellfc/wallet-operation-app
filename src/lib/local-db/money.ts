import { ApiError } from '@/lib/api';
import { currencyDecimals } from '@/lib/format';

export const decimalsOf = (currency: { code: string; type?: string }) => currencyDecimals(currency.code, currency.type);

export function roundHalfUp(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.floor(value * factor + 0.5 + 1e-9) / factor;
}

function countDecimals(value: number) {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const [, fraction = ''] = mantissa.split('.');
  return Math.max(0, fraction.length - Number(exponent));
}

export function assertAmountDecimals(amount: number, currency: { code: string; type?: string }) {
  if (countDecimals(amount) > decimalsOf(currency)) throw new ApiError(400, 'AMOUNT_DECIMALS_EXCEEDED');
}

export const notFound = () => new ApiError(404, 'NOT_FOUND');
