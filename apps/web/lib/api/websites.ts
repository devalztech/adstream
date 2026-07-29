import { apiRequest, apiRequestWithMeta } from './client';
import type { AdFormat, AdUnit, CreateWebsiteInput, Website, WebsiteStatus } from '@/types/api';

export interface UpdateWebsiteInput {
  name?: string;
  category?: string;
  language?: string;
  monthlyTrafficEstimate?: number;
}

export interface CreateAdUnitInput {
  name: string;
  format: AdFormat;
  width?: number;
  height?: number;
}

export const websitesApi = {
  create: (input: CreateWebsiteInput) => apiRequest<Website>('/websites', { method: 'POST', body: input }),

  list: (params: { status?: WebsiteStatus; limit?: number; offset?: number } = {}) =>
    apiRequestWithMeta<Website[]>('/websites', { query: params }),

  getOne: (id: string) => apiRequest<Website>(`/websites/${id}`),

  update: (id: string, input: UpdateWebsiteInput) =>
    apiRequest<Website>(`/websites/${id}`, { method: 'PATCH', body: input }),

  // A live check — the backend fetches the domain over HTTPS looking
  // for the verification token. Can genuinely fail with a specific
  // reason (site unreachable, token not found) — surface the real
  // error message from the API, don't paper over it with a generic one.
  verify: (id: string) => apiRequest<Website>(`/websites/${id}/verify`, { method: 'POST' }),

  createAdUnit: (websiteId: string, input: CreateAdUnitInput) =>
    apiRequest<AdUnit>(`/websites/${websiteId}/ad-units`, { method: 'POST', body: input }),

  listAdUnits: (websiteId: string) => apiRequest<AdUnit[]>(`/websites/${websiteId}/ad-units`),

  pauseAdUnit: (websiteId: string, adUnitId: string) =>
    apiRequest<AdUnit>(`/websites/${websiteId}/ad-units/${adUnitId}/pause`, { method: 'POST' }),

  resumeAdUnit: (websiteId: string, adUnitId: string) =>
    apiRequest<AdUnit>(`/websites/${websiteId}/ad-units/${adUnitId}/resume`, { method: 'POST' }),

  deleteAdUnit: (websiteId: string, adUnitId: string) =>
    apiRequest<void>(`/websites/${websiteId}/ad-units/${adUnitId}`, { method: 'DELETE' }),
};
