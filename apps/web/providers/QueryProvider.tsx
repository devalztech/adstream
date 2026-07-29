'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiClientError } from '@/lib/api/errors';

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created once per component instance (not per render) via useState's
  // lazy initializer — the standard TanStack Query + Next.js App Router
  // pattern, since a module-level singleton would leak state across
  // requests on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Don't retry on 401/403/404 — retrying an auth or
              // not-found error just delays showing the real state to
              // the user. Do retry transient network/5xx errors.
              if (error instanceof ApiClientError && [401, 403, 404].includes(error.status)) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
