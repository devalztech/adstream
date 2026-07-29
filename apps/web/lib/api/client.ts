import { API_V1 } from './config';
import { ApiClientError } from './errors';
import { getAccessToken, setAccessToken } from '@/lib/auth/token-store';
import type { ApiResponse } from '@/types/api';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip the automatic 401→refresh→retry — used by the refresh call itself to avoid infinite recursion. */
  skipAuthRetry?: boolean;
};

/**
 * At most one refresh request is ever in flight — if several requests
 * hit a 401 at the same moment (e.g. a dashboard firing several queries
 * in parallel), they all await this same promise instead of each
 * triggering their own /auth/refresh call and racing to rotate the
 * refresh token cookie against each other.
 */
let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_V1}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // sends the httpOnly refresh cookie
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          setAccessToken(null);
          return false;
        }
        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        setAccessToken(json.data.accessToken);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_V1}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Performs the fetch with auth headers, retries once after a successful
 * refresh on a 401, and returns the raw Response — both apiRequest and
 * apiRequestWithMeta below call this instead of duplicating the
 * fetch/retry logic themselves.
 */
async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, query, skipAuthRetry = false } = options;

  const doFetch = (): Promise<Response> => {
    const token = getAccessToken();
    return fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRetry && !path.startsWith('/auth/')) {
    const refreshed = await performRefresh();
    if (refreshed) {
      res = await doFetch();
    }
  }

  return res;
}

async function parseEnvelope<T>(res: Response): Promise<ApiResponse<T>> {
  const json = await res.json().catch(() => null);

  if (!res.ok || !json) {
    const message = json?.message ?? `Request failed with status ${res.status}`;
    throw new ApiClientError(res.status, message, json?.details);
  }

  return json as ApiResponse<T>;
}

/**
 * The main function every lib/api/<module>.ts file calls. Returns just
 * the `data` field, unwrapped — the common case for queries/mutations
 * that don't need pagination metadata.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await rawRequest(path, options);

  // 204 No Content — valid HTTP, handled defensively even though no
  // current dashboard endpoint returns it (only /ad/serve does, and
  // the dashboard never calls that surface — see INTEGRATION_MAP.md).
  if (res.status === 204) {
    return undefined as T;
  }

  const envelope = await parseEnvelope<T>(res);
  return envelope.data;
}

/**
 * Same as apiRequest, but also returns the response's `meta` block
 * (pagination `total`/`limit`/`offset`, or `unreadCount` for
 * notifications) — used by any list view that needs those.
 */
export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta: ApiResponse<T>['meta'] }> {
  const res = await rawRequest(path, options);
  const envelope = await parseEnvelope<T>(res);
  return { data: envelope.data, meta: envelope.meta };
}
