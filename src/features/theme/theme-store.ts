import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { applyTheme, currentTheme, type ThemeName } from '@/theme';

const THEME_KEY = 'theme';
const listeners = new Set<() => void>();

const isThemeName = (value: unknown): value is ThemeName => value === 'dark' || value === 'light';

function readStoredTheme(): ThemeName {
  try {
    const stored = Platform.OS === 'web' ? globalThis.localStorage?.getItem(THEME_KEY) : SecureStore.getItem(THEME_KEY);
    return isThemeName(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
}

function storeTheme(name: ThemeName) {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(THEME_KEY, name);
    else SecureStore.setItem(THEME_KEY, name);
  } catch {
    return;
  }
}

applyTheme(readStoredTheme());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function setTheme(name: ThemeName) {
  if (name === currentTheme()) return;
  applyTheme(name);
  storeTheme(name);
  listeners.forEach(listener => listener());
}

export function useThemeName() {
  return useSyncExternalStore(subscribe, currentTheme, currentTheme);
}
