import { useSyncExternalStore } from 'react';

import type { Currency } from '@/features/currencies/currency-api';
import { changeProfileCurrency, createProfile, readProfile, type LocalProfile } from '@/lib/local-db/profile';

const listeners = new Set<() => void>();
let current: LocalProfile | null = null;

const emit = () => listeners.forEach(listener => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export async function restoreLocalProfile() {
  current = await readProfile();
  emit();
  return current;
}

export async function saveLocalProfile(profile: LocalProfile) {
  current = await createProfile(profile);
  emit();
}

export async function changeLocalCurrency(currency: Currency) {
  current = await changeProfileCurrency(currency);
  emit();
  return current;
}

export async function getLocalProfile() {
  current ??= await readProfile();
  if (!current) throw new Error('LOCAL_PROFILE_MISSING');
  return current;
}

export function clearLocalProfile() {
  current = null;
  emit();
}

export function useLocalProfile() {
  return useSyncExternalStore(subscribe, () => current);
}
