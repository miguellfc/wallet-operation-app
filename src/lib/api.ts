const baseUrl = process.env.EXPO_PUBLIC_API_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly reference?: string;

  constructor(status: number, reference?: string, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.status = status;
    this.reference = reference;
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

export async function apiRequest<T>(path: string, { method = 'GET', body, token }: RequestOptions = {}) {
  if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL is not set');

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join('\n') : data?.message;
    throw new ApiError(response.status, data?.reference ?? data?.field, message);
  }
  return data as T;
}
