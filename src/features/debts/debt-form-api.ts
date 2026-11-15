import { Contact } from 'expo-contacts';
import { Platform } from 'react-native';

import { authRequest } from '@/features/auth/auth-request';

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
  return authRequest<{ _id: string }>('/debts', { method: 'POST', body: debt });
}
