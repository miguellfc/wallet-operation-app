import type { Currency } from '@/features/currencies/currency-api';
import { ApiError } from '@/lib/api';

import { authRequest } from './auth-request';
import { clearSession } from './session';

export type Account = { firstName: string; lastName: string; nickname: string; currency: Currency };

export type AccountChanges = { firstName: string; lastName: string; nickname: string };

const CONNECTION_ERROR = 'No se pudo conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.';

export async function loadAccount() {
  return authRequest<Account>('/users');
}

export async function updateAccount(changes: AccountChanges) {
  return authRequest<Account>('/users', { method: 'PATCH', body: changes });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return authRequest<null>('/users/password', { method: 'PATCH', body: { currentPassword, newPassword } });
}

export async function closeAllSessions() {
  await authRequest<null>('/auth/logout/all', { method: 'POST' });
  await clearSession();
}

export async function deleteAccount() {
  await authRequest<null>('/users', { method: 'DELETE' });
  await clearSession();
}

export function accountErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.reference === 'NICKNAME_ALREADY_EXISTS') return 'Ese nombre de usuario ya está en uso.';
  return 'No se pudieron guardar tus datos. Vuelve a intentarlo.';
}

export function passwordErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  if (error.reference === 'INVALID_PASSWORD') return 'La contraseña actual no es correcta.';
  return 'No se pudo cambiar la contraseña. Vuelve a intentarlo.';
}

export function sessionErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CONNECTION_ERROR;
  return 'No se pudo completar la acción. Vuelve a intentarlo.';
}
