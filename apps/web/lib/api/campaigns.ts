import { apiRequest, apiRequestWithMeta } from './client';
import type { Campaign, CampaignStatus, Creative, CreateCampaignInput } from '@/types/api';

export interface UpdateCampaignInput {
  name?: string;
  totalBudget?: number;
  dailyBudget?: number | null;
  bidAmount?: number;
  startDate?: string;
  endDate?: string | null;
  targetCountries?: string[];
  targetDevices?: Campaign['targetDevices'];
  targetCategories?: string[];
  targetOs?: string[];
  frequencyCap?: number | null;
  destinationUrl?: string;
  trackingParams?: Record<string, string>;
}

export const campaignsApi = {
  create: (input: CreateCampaignInput) => apiRequest<Campaign>('/campaigns', { method: 'POST', body: input }),

  list: (params: { status?: CampaignStatus; limit?: number; offset?: number } = {}) =>
    apiRequestWithMeta<Campaign[]>('/campaigns', { query: params }),

  getOne: (id: string) => apiRequest<Campaign>(`/campaigns/${id}`),

  update: (id: string, input: UpdateCampaignInput) =>
    apiRequest<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: input }),

  submit: (id: string) => apiRequest<Campaign>(`/campaigns/${id}/submit`, { method: 'POST' }),
  pause: (id: string) => apiRequest<Campaign>(`/campaigns/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => apiRequest<Campaign>(`/campaigns/${id}/resume`, { method: 'POST' }),
  archive: (id: string) => apiRequest<Campaign>(`/campaigns/${id}/archive`, { method: 'POST' }),
  duplicate: (id: string) => apiRequest<Campaign>(`/campaigns/${id}/duplicate`, { method: 'POST' }),

  addCreative: (id: string, creative: CreateCampaignInput['creatives'][number]) =>
    apiRequest<Creative>(`/campaigns/${id}/creatives`, { method: 'POST', body: creative }),

  removeCreative: (id: string, creativeId: string) =>
    apiRequest<void>(`/campaigns/${id}/creatives/${creativeId}`, { method: 'DELETE' }),
};
