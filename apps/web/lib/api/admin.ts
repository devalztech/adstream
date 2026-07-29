import { apiRequest, apiRequestWithMeta } from './client';
import type { AdminUserRow, Campaign, PlatformOverview, Role, Website, WithdrawalRequest } from '@/types/api';

export const adminApi = {
  overview: () => apiRequest<PlatformOverview>('/admin/overview'),

  listPendingCampaigns: (params: { status?: string; limit?: number; offset?: number } = {}) =>
    apiRequest<Campaign[]>('/admin/campaigns/pending', { query: params }),
  approveCampaign: (id: string) => apiRequest<Campaign>(`/admin/campaigns/${id}/approve`, { method: 'POST' }),
  rejectCampaign: (id: string, reason: string) =>
    apiRequest<Campaign>(`/admin/campaigns/${id}/reject`, { method: 'POST', body: { reason } }),

  listPendingWebsites: (params: { status?: string; limit?: number; offset?: number } = {}) =>
    apiRequest<Website[]>('/admin/websites/pending', { query: params }),
  approveWebsite: (id: string) => apiRequest<Website>(`/admin/websites/${id}/approve`, { method: 'POST' }),
  rejectWebsite: (id: string, reason: string) =>
    apiRequest<Website>(`/admin/websites/${id}/reject`, { method: 'POST', body: { reason } }),
  suspendWebsite: (id: string, reason: string) =>
    apiRequest<Website>(`/admin/websites/${id}/suspend`, { method: 'POST', body: { reason } }),

  listPendingWithdrawals: (params: { limit?: number; offset?: number } = {}) =>
    apiRequest<WithdrawalRequest[]>('/admin/withdrawals/pending', { query: params }),
  processWithdrawal: (id: string) =>
    apiRequest<{ status: string }>(`/admin/withdrawals/${id}/process`, { method: 'POST' }),

  listUsers: (params: { role?: Role; search?: string; limit?: number; offset?: number } = {}) =>
    apiRequestWithMeta<AdminUserRow[]>('/admin/users', { query: params }),
  suspendUser: (id: string, reason?: string) =>
    apiRequest<void>(`/admin/users/${id}/suspend`, { method: 'POST', body: { reason } }),
  reactivateUser: (id: string) => apiRequest<void>(`/admin/users/${id}/reactivate`, { method: 'POST' }),
  adjustWallet: (id: string, amount: number, reason: string) =>
    apiRequest<void>(`/admin/users/${id}/wallet/adjust`, { method: 'POST', body: { amount, reason } }),
};
