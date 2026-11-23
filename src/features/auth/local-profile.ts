import { useSyncExternalStore } from 'react';

import { createProfile, readProfile, type LocalProfile } from '@/lib/local-db/profile';

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
}

export async function saveLocalProfile(profile: LocalProfile) {
  current = await createProfile(profile);
  emit();
}

export async function getLocalProfile() {
  current ??= await readProfile();
  if (!current) throw new Error('LOCAL_PROFILE_MISSING');
  return current;
}

export function useLocalProfile() {
  return useSyncExternalStore(subscribe, () => current);
}
