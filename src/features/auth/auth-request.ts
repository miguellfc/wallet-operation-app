import { ApiError, apiRequest, type RequestOptions } from '@/lib/api';

import { clearSession, getSession, saveSession, type Session } from './session';

let refreshing: Promise<Session | null> | null = null;

function refreshSession(refreshToken: string) {
  refreshing ??= apiRequest<Session>('/auth/refresh', { method: 'POST', body: { refreshToken } })
    .then(async session => {
      await saveSession(session);
      return session;
    })
    .catch(async error => {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        return null;
      }
      throw error;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function authRequest<T>(path: string, options: Omit<RequestOptions, 'token'> = {}) {
  const session = getSession();
  if (!session) throw new ApiError(401, 'NO_SESSION');

  try {
    return await apiRequest<T>(path, { ...options, token: session.token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const current = getSession();
    if (!current) throw error;
    const renewed = current.token !== session.token ? current : await refreshSession(current.refreshToken);
    if (!renewed) throw error;
    return apiRequest<T>(path, { ...options, token: renewed.token });
  }
}
