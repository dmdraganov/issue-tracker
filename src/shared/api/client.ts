import { envConfig } from '../config/env-config';
import { HttpError } from './error';

export async function apiRequest(
  endpoint: string | URL,
  options?: RequestInit
) {
  const url = new URL(endpoint, envConfig.VITE_API_URL);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer`,
    },
    credentials: 'include',
  });

  if (!response.ok)
    throw new HttpError(response.status, `HTTP error: ${response.status}`);

  return response.json() as unknown;
}
