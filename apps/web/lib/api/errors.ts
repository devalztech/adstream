import type { ApiErrorBody } from '@/types/api';

/**
 * Thrown by the API client for any non-2xx response. Carries the parsed
 * backend error body so callers (forms especially) can read `.details`
 * for field-level validation errors instead of just a generic message.
 */
export class ApiClientError extends Error {
  status: number;
  details?: ApiErrorBody['details'];

  constructor(status: number, message: string, details?: ApiErrorBody['details']) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}
