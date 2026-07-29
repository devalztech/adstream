import { apiRequest, apiRequestWithMeta } from './client';
import type { Notification } from '@/types/api';

export const notificationsApi = {
  list: (params: { unreadOnly?: boolean; limit?: number; offset?: number } = {}) =>
    apiRequestWithMeta<Notification[]>('/notifications', { query: params }),

  markRead: (id: string) => apiRequest<void>(`/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => apiRequest<void>('/notifications/read-all', { method: 'POST' }),
};
