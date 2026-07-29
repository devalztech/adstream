import { apiRequest } from './client';
import type { AuthResult, Role, User } from '@/types/api';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: Extract<Role, 'advertiser' | 'publisher'>;
  companyName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    apiRequest<Pick<User, 'id' | 'email' | 'fullName' | 'role'>>('/auth/register', {
      method: 'POST',
      body: input,
    }),

  login: (input: LoginInput) => apiRequest<AuthResult>('/auth/login', { method: 'POST', body: input }),

  // No body needed — the refresh token travels via the httpOnly cookie
  // automatically (credentials: 'include' in the client), scoped to
  // /api/v1/auth by the backend. skipAuthRetry avoids this call
  // recursively trying to refresh itself on its own 401.
  refresh: () => apiRequest<AuthResult>('/auth/refresh', { method: 'POST', skipAuthRetry: true }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', skipAuthRetry: true }),

  verifyEmail: (token: string) => apiRequest<void>('/auth/verify-email', { method: 'POST', body: { token } }),

  forgotPassword: (email: string) =>
    apiRequest<void>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, newPassword: string) =>
    apiRequest<void>('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
};
