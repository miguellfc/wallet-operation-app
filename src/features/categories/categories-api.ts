import { authRequest } from '@/features/auth/auth-request';
import { CATEGORY_ICONS } from '@/features/categories/category-icons';
import { isLocal } from '@/lib/data-source';
import * as local from '@/lib/local-db/categories';

export type CategoryType = 'INCOME' | 'EXPENSE';

export type Category = { _id: string; name: string; type: CategoryType; color: string; icon?: string };

export type CategoryInput = { name: string; color: string; icon: string };

const INTERNAL_ICONS = new Set([
  'prestamo',
  'transferencia',
  'saldo inicial',
  'calendario',
  'billetera',
  'me debe',
  'le debo',
  'recurrente',
  'default',
]);

const ICON_LABELS: Record<string, string> = { educacion: 'Educación', loteria: 'Lotería' };

export const CATEGORY_ICON_OPTIONS = Object.keys(CATEGORY_ICONS)
  .filter(key => !INTERNAL_ICONS.has(key))
  .map(key => ({ value: key, label: ICON_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1) }));

export const DEFAULT_CATEGORY_ICON = 'otros';

export const categoryIconName = (category: { name: string; icon?: string }) => category.icon || category.name;

export async function loadCategories(type: CategoryType) {
  if (isLocal) return { type, categories: await local.listCategories(type) };
  const page = await authRequest<{ data: Category[] }>('/categories/search', {
    method: 'POST',
    body: { filters: { type }, sort: { name: 1 }, size: 200 },
  });
  return { type, categories: page.data };
}

export async function loadCategory(id: string) {
  if (isLocal) return local.getCategory(id);
  return authRequest<Category>(`/categories/${id}`);
}

export async function createCategory(type: CategoryType, input: CategoryInput) {
  if (isLocal) return local.createCategory(type, input);
  return authRequest<{ _id: string }>('/categories', { method: 'POST', body: { type, ...input } });
}

export async function updateCategory(id: string, input: CategoryInput) {
  if (isLocal) return local.updateCategory(id, input);
  return authRequest<{ _id: string }>(`/categories/${id}`, { method: 'PATCH', body: input });
}

export async function deleteCategory(id: string) {
  if (isLocal) return local.deleteCategory(id);
  return authRequest<unknown>(`/categories/${id}`, { method: 'DELETE' });
}
