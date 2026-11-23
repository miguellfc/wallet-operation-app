import { authRequest } from '@/features/auth/auth-request';
import { loadWallets, type WalletSummary } from '@/features/wallets/wallets-api';
import { isLocal } from '@/lib/data-source';
import { listCategories } from '@/lib/local-db/categories';
import * as local from '@/lib/local-db/operation-service';

export type FormOperationType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type FormWallet = WalletSummary;

export type FormCategory = { id: string; name: string; type: 'INCOME' | 'EXPENSE'; icon?: string };

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
  if (isLocal) {
    const [wallets, income, expense] = await Promise.all([
      loadWallets(),
      listCategories('INCOME'),
      listCategories('EXPENSE'),
    ]);
    const categories = [...income, ...expense].sort((a, b) => a.name.localeCompare(b.name));
    return {
      wallets: wallets.wallets,
      categories: categories.map(category => ({ id: category._id, name: category.name, type: category.type, icon: category.icon })),
    };
  }
  const [wallets, categories] = await Promise.all([
    loadWallets(),
    authRequest<Page<{ _id: string; name: string; type: FormCategory['type']; icon?: string }>>('/categories/search', {
      method: 'POST',
      body: { size: PAGE_SIZE, sort: { name: 1 } },
    }),
  ]);
  return {
    wallets: wallets.wallets,
    categories: categories.data.map(category => ({ id: category._id, name: category.name, type: category.type, icon: category.icon })),
  };
}

export async function convertAmount(amount: number, from: string, to: string) {
  if (isLocal) return local.convertLocalAmount(amount, from, to);
  return authRequest<{ amount: number; currency: string }>('/currency-exchange/convert', {
    method: 'POST',
    body: { amount, from, to },
  });
}

export async function updateOperation(id: string, changes: Partial<NewOperation>) {
  if (isLocal) return local.updateLocalOperation(id, changes);
  return authRequest<{ _id: string }>(`/operations/${id}`, { method: 'PATCH', body: changes });
}

export async function createOperation(operation: NewOperation) {
  if (isLocal) return local.createLocalOperation(operation);
  return authRequest<{ _id: string }>('/operations', { method: 'POST', body: operation });
}
