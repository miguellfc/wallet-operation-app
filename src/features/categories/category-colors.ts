import { useEffect, useSyncExternalStore } from 'react';

import { loadCategories } from '@/features/categories/categories-api';

type CategoryRef = { id?: string; color?: string } | null | undefined;

let current: ReadonlyMap<string, string> | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

const isColor = (value?: string): value is string => !!value && /^#[0-9a-f]{3,8}$/i.test(value);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const snapshot = () => current;

export function refreshCategoryColors() {
  pending ??= Promise.all([loadCategories('INCOME'), loadCategories('EXPENSE')])
    .then(([income, expense]) => {
      current = new Map([...income.categories, ...expense.categories].map(item => [item._id, item.color]));
      listeners.forEach(listener => listener());
    })
    .catch(() => undefined)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useCategoryColor() {
  const colors = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    if (!current) refreshCategoryColors();
  }, []);

  return (category: CategoryRef, fallback: string) => {
    const configured = category?.id ? colors?.get(category.id) : undefined;
    if (isColor(configured)) return configured;
    return isColor(category?.color) ? category.color : fallback;
  };
}
