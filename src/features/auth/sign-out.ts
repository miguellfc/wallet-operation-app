import { Alert, Platform } from 'react-native';

import { logout } from './auth-api';
import { clearSession, getSession } from './session';

async function signOut() {
  const session = getSession();
  if (session) await logout(session.token).catch(() => null);
  await clearSession();
}

export function confirmSignOut() {
  const message = '¿Quieres cerrar la sesión?';
  if (Platform.OS === 'web') {
    const browser = globalThis as { confirm?: (text: string) => boolean };
    if (browser.confirm?.(message)) signOut();
    return;
  }
  Alert.alert('Cerrar sesión', message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
  ]);
}
