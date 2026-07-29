import { apiRequest, apiRequestWithMeta } from './client';
import type {
  DepositInitResult,
  DepositVerifyResult,
  PaymentProvider,
  WithdrawalDestination,
  WithdrawalRequest,
} from '@/types/api';

export const paymentsApi = {
  initiateDeposit: (amount: number, provider: PaymentProvider) =>
    apiRequest<DepositInitResult>('/payments/deposit', { method: 'POST', body: { amount, provider } }),

  verifyDeposit: (reference: string, provider: PaymentProvider) =>
    apiRequest<DepositVerifyResult>('/payments/deposit/verify', { query: { reference, provider } }),

  // Publisher-only on the backend — see INTEGRATION_MAP.md. The
  // frontend still gates the UI by role, but the backend's 403 is the
  // real boundary if this is ever called incorrectly.
  requestWithdrawal: (input: { amount: number; provider: PaymentProvider; destination: WithdrawalDestination }) =>
    apiRequest<WithdrawalRequest>('/payments/withdraw', { method: 'POST', body: input }),

  listWithdrawals: (params: { limit?: number; offset?: number } = {}) =>
    apiRequestWithMeta<WithdrawalRequest[]>('/payments/withdrawals', { query: params }),
};
