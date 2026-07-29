/**
 * Types mirror INTEGRATION_MAP.md exactly — every field name, every
 * enum value, matches what the real backend sends. Do not add fields
 * here that the backend doesn't return.
 */

export type Role = 'advertiser' | 'publisher' | 'admin';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    unreadCount?: number;
  };
}

export interface ApiErrorBody {
  success: false;
  message: string;
  details?: { field: string; message: string }[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  companyName?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
  role: Role;
}

export interface AuthResult {
  accessToken: string;
  user: Pick<User, 'id' | 'email' | 'fullName' | 'role'>;
}

// ---------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------

export interface Wallet {
  id: string;
  balance: number; // integer, smallest currency unit
  currency: string;
  createdAt: string;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'campaign_spend'
  | 'publisher_earning'
  | 'refund'
  | 'adjustment';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // positive = credit, negative = debit
  balanceAfter: number;
  reference: string | null;
  status: TransactionStatus;
  description: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------

export type PaymentProvider = 'paystack' | 'flutterwave';

export interface DepositInitResult {
  authorizationUrl: string;
  reference: string;
}

export interface DepositVerifyResult {
  status: 'success' | 'pending' | 'failed';
  alreadyProcessed?: boolean;
}

export interface WithdrawalDestination {
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  destination: WithdrawalDestination;
  status: WithdrawalStatus;
  failure_reason: string | null;
  requested_at: string;
  processed_at: string | null;
}

// ---------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------

export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'archived';

export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type CreativeType = 'banner' | 'native' | 'text' | 'video';

export interface Creative {
  id: string;
  type: CreativeType;
  assetUrl: string | null;
  width: number | null;
  height: number | null;
  headline: string | null;
  bodyText: string | null;
  isActive?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  totalBudget: number;
  dailyBudget: number | null;
  bidAmount: number;
  spentAmount: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  targetCountries: string[];
  targetDevices: DeviceType[];
  targetCategories: string[];
  targetOs: string[];
  frequencyCap: number | null;
  destinationUrl: string;
  trackingParams: Record<string, string> | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  creatives?: Creative[];
}

export interface CreateCampaignInput {
  name: string;
  totalBudget: number;
  dailyBudget?: number;
  bidAmount: number;
  currency?: string;
  startDate: string;
  endDate?: string;
  targetCountries?: string[];
  targetDevices?: DeviceType[];
  targetCategories?: string[];
  targetOs?: string[];
  frequencyCap?: number;
  destinationUrl: string;
  trackingParams?: Record<string, string>;
  creatives: Array<{
    type: CreativeType;
    assetUrl?: string;
    width?: number;
    height?: number;
    fileSizeBytes?: number;
    mimeType?: string;
    headline?: string;
    bodyText?: string;
  }>;
}

// ---------------------------------------------------------------------
// Websites & Ad Units
// ---------------------------------------------------------------------

export type WebsiteStatus = 'pending' | 'verified' | 'approved' | 'rejected' | 'suspended';
export type VerificationMethod = 'meta_tag' | 'dns_txt' | 'file_upload';
export type AdFormat =
  | 'banner'
  | 'rectangle'
  | 'leaderboard'
  | 'sidebar'
  | 'native'
  | 'responsive'
  | 'square'
  | 'sticky';
export type AdUnitStatus = 'active' | 'paused' | 'archived';

export interface AdUnit {
  id: string;
  name: string;
  format: AdFormat;
  width: number | null;
  height: number | null;
  embedKey: string;
  status: AdUnitStatus;
  createdAt: string;
  embedCode?: string;
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  category: string | null;
  language: string;
  monthlyTrafficEstimate: number | null;
  verificationMethod: VerificationMethod;
  verificationToken: string;
  verifiedAt: string | null;
  status: WebsiteStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  adUnits?: AdUnit[];
}

export interface CreateWebsiteInput {
  name: string;
  domain: string;
  category?: string;
  language?: string;
  monthlyTrafficEstimate?: number;
  verificationMethod?: VerificationMethod;
}

// ---------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------

export type AnalyticsRange = 'today' | '7d' | '30d' | '90d' | 'year';

export interface AnalyticsMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpm: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
}

export interface AdvertiserOverview extends AnalyticsMetrics {
  activeCampaigns: number;
  topCampaigns: Array<{ id: string; name: string; impressions: number; spend: number }>;
}

export interface CampaignAnalytics extends AnalyticsMetrics {
  daily: Array<{ date: string; impressions: number; clicks: number }>;
  topCountries: Array<{ country: string; impressions: number }>;
  topDevices: Array<{ device: string; impressions: number }>;
}

export interface PublisherOverview {
  impressions: number;
  clicks: number;
  earnings: number;
  activeSites: number;
  topSites: Array<{ id: string; name: string; domain: string; impressions: number; earnings: number }>;
}

export interface WebsiteAnalytics {
  impressions: number;
  clicks: number;
  earnings: number;
  daily: Array<{ date: string; impressions: number; earnings: number }>;
}

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------

export interface PlatformOverview {
  totalAdvertisers: number;
  totalPublishers: number;
  activeCampaigns: number;
  pendingCampaigns: number;
  pendingWebsites: number;
  approvedWebsites: number;
  pendingWithdrawals: number;
  revenueLast30Days: number;
  totalWalletBalances: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  company_name: string | null;
  is_active: boolean;
  is_locked: boolean;
  email_verified_at: string | null;
  created_at: string;
  role: Role;
}
