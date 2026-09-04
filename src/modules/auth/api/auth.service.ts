import { apiRequest } from '@/shared/api/client';
import type { LogInFormData } from '../models/schemas/login.schema';
import { authenticationSchema } from './auth.schema';
import type { SignUpFormData } from '../models/schemas/signup.schema';

function authApiRequest(endpoint: string, options?: RequestInit) {
  return apiRequest(`/auth${endpoint}`, options);
}

export async function logIn(logInData: LogInFormData) {
  const response = await authApiRequest('/login', {
    method: 'POST',
    body: JSON.stringify(logInData),
  });
  return authenticationSchema.parse(response);
}

export async function signUp(signUpData: SignUpFormData) {
  const response = await authApiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(signUpData),
  });
  return authenticationSchema.parse(response);
}

export async function refresh() {
  const response = await authApiRequest('/refresh', {
    method: 'POST',
  });
  return authenticationSchema.parse(response);
}

export function logOut() {
  return authApiRequest('/logout', {
    method: 'POST',
  });
}
