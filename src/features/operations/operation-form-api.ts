import { authRequest } from '@/features/auth/auth-request';
import { loadWallets, type WalletSummary } from '@/features/wallets/wallets-api';

export type FormOperationType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type FormWallet = WalletSummary;

export type FormCategory = { id: string; name: string; type: 'INCOME' | 'EXPENSE' };

export type OperationFormData = { wallets: FormWallet[]; categories: FormCategory[] };

export type NewOperation = {
  type: FormOperationType;
  date: string;
  amount: number;
  description?: string;
  category?: string;
  from?: string;
  to?: string;
};

type Page<T> = { data: T[] };

const PAGE_SIZE = 200;

export async function loadOperationForm(): Promise<OperationFormData> {
  const [wallets, categories] = await Promise.all([
    loadWallets(),
    authRequest<Page<{ _id: string; name: string; type: FormCategory['type'] }>>('/categories/search', {
      method: 'POST',
      body: { size: PAGE_SIZE, sort: { name: 1 } },
    }),
  ]);
  return {
    wallets: wallets.wallets,
    categories: categories.data.map(category => ({ id: category._id, name: category.name, type: category.type })),
  };
}

export async function convertAmount(amount: number, from: string, to: string) {
  return authRequest<{ amount: number; currency: string }>('/currency-exchange/convert', {
    method: 'POST',
    body: { amount, from, to },
  });
}

export async function createOperation(operation: NewOperation) {
  return authRequest<{ _id: string }>('/operations', { method: 'POST', body: operation });
}
