import { apiRequest } from './client';
import type { User } from '@/types/api';

export interface UpdateProfileInput {
  fullName?: string;
  companyName?: string;
}

export const usersApi = {
  getMe: () => apiRequest<User>('/users/me'),
  updateMe: (input: UpdateProfileInput) => apiRequest<User>('/users/me', { method: 'PATCH', body: input }),
};
