import { Contact } from 'expo-contacts';
import { Platform } from 'react-native';

import { authRequest } from '@/features/auth/auth-request';
import type { CurrencyType } from '@/features/currencies/currency-api';
import type { Operation } from '@/features/operations/operations-api';
import { isLocal } from '@/lib/data-source';
import { currencyDecimals } from '@/lib/format';
import * as local from '@/lib/local-db/debts';

export type DebtType = 'LENT' | 'BORROWED';

export type NewDebt = {
  person: string;
  type: DebtType;
  amount: number;
  wallet: string;
  date: string;
  color: string;
  description?: string;
};

export const canPickContact = Platform.OS !== 'web';

export async function pickContactName() {
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const name = (await contact.getFullName()).trim();
  return name === '' ? null : name;
}

export async function createDebt(debt: NewDebt) {
  if (isLocal) return local.createDebt(debt);
  return authRequest<{ _id: string }>('/debts', { method: 'POST', body: debt });
}

export type DebtAction = 'PAYMENT' | 'INCREASE';

export type DebtDocument = {
  _id: string;
  person: string;
  type: DebtType;
  amount: number;
  pending: number;
  currency: { code: string; type: CurrencyType };
  wallet: { id: string; name: string };
  date: string;
  color?: string;
  description?: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
};

export type DebtDetail = { debt: DebtDocument; decimals: number; operations: Operation[]; hasMore: boolean };

export type DebtEditing = { debt: DebtDocument; opening: Operation };

export async function loadDebt(id: string) {
  if (isLocal) return local.getDebt(id);
  return authRequest<DebtDocument>(`/debts/${id}`);
}

export async function loadDebtDetail(id: string, size: number): Promise<DebtDetail> {
  if (isLocal) return local.getDebtDetail(id, size);
  const [debt, operations] = await Promise.all([
    loadDebt(id),
    authRequest<{ data: Operation[] }>('/operations/search', {
      method: 'POST',
      body: { filters: { 'debt.id': id }, sort: { date: -1 }, size: size + 1 },
    }),
  ]);
  return {
    debt,
    decimals: currencyDecimals(debt.currency.code, debt.currency.type),
    operations: operations.data.slice(0, size),
    hasMore: operations.data.length > size,
  };
}

export async function loadDebtEditing(id: string): Promise<DebtEditing> {
  if (isLocal) return local.getDebtEditing(id);
  const [debt, openings] = await Promise.all([
    loadDebt(id),
    authRequest<{ data: Operation[] }>('/operations/search', {
      method: 'POST',
      body: { filters: { 'debt.id': id, 'debt.action': 'OPENING' }, size: 1 },
    }),
  ]);
  const opening = openings.data[0];
  if (!opening) throw new Error('debt opening not found');
  return { debt, opening };
}

export async function updateDebt(
  id: string,
  changes: { person?: string; date?: string; color?: string; description?: string },
) {
  if (isLocal) return local.updateDebt(id, changes);
  return authRequest<{ _id: string }>(`/debts/${id}`, { method: 'PATCH', body: changes });
}

export async function deleteDebt(id: string) {
  if (isLocal) return local.deleteDebt(id);
  return authRequest<unknown>(`/debts/${id}`, { method: 'DELETE' });
}

export async function addDebtOperation(
  id: string,
  operation: { action: DebtAction; amount: number; wallet: string; date: string },
) {
  if (isLocal) return local.addDebtOperation(id, operation);
  return authRequest<unknown>(`/debts/${id}/operations`, { method: 'POST', body: operation });
}
