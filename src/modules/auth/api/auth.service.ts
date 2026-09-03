import { apiRequest } from '@/shared/api/client';
import type { LogInFormData } from '../models/schemas/login.schema';
import { authenticationSchema } from './dtos/auth.dto';
import type { SignUpFormData } from '../models/schemas/signup.schema';

function authApiRequest(endpoint: string, options?: RequestInit) {
  return apiRequest(`/auth${endpoint}`, options);
}

export async function logIn(logInData: LogInFormData) {
  const response = await authApiRequest('/login', {
    method: 'POST',
    body: JSON.stringify(logInData),
  });
  const data = authenticationSchema.parse(response);
  //Положить данные в стор
}

export async function signUp(signUpData: SignUpFormData) {
  const response = await authApiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(signUpData),
  });
  const data = authenticationSchema.parse(response);
  //Положить данные в стор
}

export async function refresh() {
  const response = await authApiRequest('/refresh', {
    method: 'POST',
  });
  const data = authenticationSchema.parse(response);
  //Положить данные в стор
}

export async function logOut() {
  await authApiRequest('/logout', {
    method: 'POST',
  });
}
