import { apiRequest } from './client';
import type {
  AdvertiserOverview,
  AnalyticsRange,
  CampaignAnalytics,
  PublisherOverview,
  WebsiteAnalytics,
} from '@/types/api';

export const analyticsApi = {
  advertiserOverview: (range: AnalyticsRange = '30d') =>
    apiRequest<AdvertiserOverview>('/analytics/advertiser/overview', { query: { range } }),

  campaignAnalytics: (campaignId: string, range: AnalyticsRange = '30d') =>
    apiRequest<CampaignAnalytics>(`/analytics/campaigns/${campaignId}`, { query: { range } }),

  publisherOverview: (range: AnalyticsRange = '30d') =>
    apiRequest<PublisherOverview>('/analytics/publisher/overview', { query: { range } }),

  websiteAnalytics: (websiteId: string, range: AnalyticsRange = '30d') =>
    apiRequest<WebsiteAnalytics>(`/analytics/websites/${websiteId}`, { query: { range } }),
};
