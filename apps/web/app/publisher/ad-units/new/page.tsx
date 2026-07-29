'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { websitesApi } from '@/lib/api/websites';

/**
 * Ad units are created from a specific website's page (they're scoped
 * under /websites/:id/ad-units on the backend — see INTEGRATION_MAP.md),
 * so this page's job is picking which website to add one to, rather
 * than duplicating the AddAdUnitDialog as a full standalone page.
 */
export default function NewAdUnitPage() {
  const query = useQuery({
    queryKey: ['websites', 'verified-for-new-ad-unit'],
    queryFn: () => websitesApi.list({ limit: 100 }),
  });

  const eligible = (query.data?.data ?? []).filter((w) => w.status === 'verified' || w.status === 'approved');

  return (
    <div>
      <PageHeader title="New ad unit" description="Choose which website to add an ad unit to." />

      {query.isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : eligible.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No verified websites"
          description="Add and verify a website first, then you can create ad units on it."
          actionLabel="Add website"
          onAction={() => {
            window.location.href = '/publisher/websites/new';
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {eligible.map((w) => (
            <Link key={w.id} href={`/publisher/websites/${w.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-sm text-muted-foreground">{w.domain}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
