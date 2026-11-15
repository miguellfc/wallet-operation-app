import { showConfirm } from '@/components/ui/confirm-dialog';

import { logout } from './auth-api';
import { clearSession, getSession } from './session';

async function signOut() {
  const session = getSession();
  if (session) await logout(session.token).catch(() => null);
  await clearSession();
}

export function confirmSignOut() {
  showConfirm({
    title: 'Cerrar sesión',
    message: '¿Quieres cerrar la sesión?',
    confirmLabel: 'Cerrar sesión',
    onConfirm: signOut,
  });
}
