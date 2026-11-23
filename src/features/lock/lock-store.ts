import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { clearLocalProfile } from '@/features/auth/local-profile';
import { deleteDatabase } from '@/lib/local-db/database';

import { clearPin, hasPin } from './pin';

export type LockState = { pinSet: boolean; locked: boolean };

const RELOCK_AFTER_MS = 60_000;

const listeners = new Set<() => void>();
let current: LockState = { pinSet: false, locked: false };
let backgroundSince: number | null = null;

const set = (next: LockState) => {
  current = next;
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export async function restoreLock(profileExists: boolean) {
  if (!profileExists) await clearPin();
  const pinSet = profileExists && (await hasPin());
  set({ pinSet, locked: pinSet });
}

export function completePinSetup() {
  set({ pinSet: true, locked: false });
}

export function unlock() {
  set({ ...current, locked: false });
}

export async function resetLocalData() {
  await clearPin();
  await deleteDatabase();
  backgroundSince = null;
  set({ pinSet: false, locked: false });
  clearLocalProfile();
}

export function watchAppState() {
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'background') {
      backgroundSince ??= Date.now();
      return;
    }
    if (state !== 'active') return;
    const away = backgroundSince === null ? 0 : Date.now() - backgroundSince;
    backgroundSince = null;
    if (current.pinSet && away > RELOCK_AFTER_MS) set({ ...current, locked: true });
  });
  return () => subscription.remove();
}

export function useLockState() {
  return useSyncExternalStore(subscribe, () => current);
}
