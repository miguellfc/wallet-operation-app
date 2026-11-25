import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

export type Session = { token: string; refreshToken: string };

const SESSION_KEY = 'session';
const listeners = new Set<() => void>();
let current: Session | null = null;

const emit = () => listeners.forEach(listener => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export async function restoreSession() {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  current = stored ? (JSON.parse(stored) as Session) : null;
  emit();
}

export async function saveSession(session: Session) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  current = session;
  emit();
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  current = null;
  emit();
}

export function getSession() {
  return current;
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => current);
}
