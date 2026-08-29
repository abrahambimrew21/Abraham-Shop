import { useUserStore } from '@/store/user.store';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface ApiError {
  name: 'ApiError';
  status: number;
  message: string;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as ApiError).name === 'ApiError'
  );
}

function createApiError(status: number, message: string): ApiError {
  return { name: 'ApiError', status, message };
}

export async function fetchApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const userStore = useUserStore();
  const token = userStore.getAccessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw createApiError(response.status, message);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
