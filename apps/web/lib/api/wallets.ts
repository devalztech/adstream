import { apiRequestWithMeta, apiRequest } from './client';
import type { Transaction, Wallet } from '@/types/api';

export const walletsApi = {
  getMyWallet: () => apiRequest<Wallet>('/wallets/me'),

  getMyTransactions: (params: { limit?: number; offset?: number } = {}) =>
    apiRequestWithMeta<Transaction[]>('/wallets/me/transactions', { query: params }),
};
