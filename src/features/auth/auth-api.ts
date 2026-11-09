import type { CurrencyType } from '@/features/currencies/currency-api';
import { ApiError, apiRequest } from '@/lib/api';

import type { Session } from './session';

export type NewUser = {
  firstName: string;
  lastName: string;
  nickname: string;
  password: string;
  currency: string;
  type: CurrencyType;
};

export function register(user: NewUser) {
  return apiRequest<unknown>('/users', { method: 'POST', body: user });
}

export function registerErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor';
  if (error.reference === 'NICKNAME_ALREADY_EXISTS') return 'Ese nombre de usuario ya está en uso';
  if (error.status === 429) return 'Se han creado demasiadas cuentas desde aquí. Espera un rato y vuelve a probar';
  if (error.status === 400) return error.message;
  return 'Algo salió mal. Inténtalo de nuevo';
}

export function login(nickname: string, password: string) {
  return apiRequest<Session>('/auth/login', { method: 'POST', body: { nickname, password } });
}

export function logout(token: string) {
  return apiRequest<null>('/auth/logout', { method: 'POST', token });
}

export function loginErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return 'No se pudo conectar con el servidor';
  if (error.reference === 'INVALID_CREDENTIALS') return 'Usuario o contraseña incorrectos';
  if (error.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a probar';
  if (error.status === 400) return error.message;
  return 'Algo salió mal. Inténtalo de nuevo';
}
