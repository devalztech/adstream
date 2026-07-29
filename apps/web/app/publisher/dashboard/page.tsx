'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Globe, Eye, MousePointerClick } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { RangeSelect } from '@/components/charts/range-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi } from '@/lib/api/analytics';
import { websitesApi } from '@/lib/api/websites';
import { formatMoney } from '@/lib/money';
import type { AnalyticsRange } from '@/types/api';

export default function PublisherDashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const overviewQuery = useQuery({
    queryKey: ['analytics', 'publisher-overview', range],
    queryFn: () => analyticsApi.publisherOverview(range),
  });

  const websitesQuery = useQuery({
    queryKey: ['websites', 'recent'],
    queryFn: () => websitesApi.list({ limit: 5 }),
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your monetization performance at a glance."
        action={
          <Button asChild>
            <Link href="/publisher/websites/new">Add website</Link>
          </Button>
        }
      />

      <div className="mb-6 flex justify-end">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {overviewQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState message={overviewQuery.error.message} onRetry={() => overviewQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Earnings" value={formatMoney(overviewQuery.data?.earnings ?? 0)} icon={DollarSign} />
          <StatCard label="Active sites" value={String(overviewQuery.data?.activeSites ?? 0)} icon={Globe} />
          <StatCard label="Impressions" value={(overviewQuery.data?.impressions ?? 0).toLocaleString()} icon={Eye} />
          <StatCard
            label="Clicks"
            value={(overviewQuery.data?.clicks ?? 0).toLocaleString()}
            icon={MousePointerClick}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {overviewQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top sites by earnings</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewQuery.data.topSites.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No earnings in this range yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {overviewQuery.data.topSites.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.domain}</p>
                        </div>
                        <div className="flex items-center gap-6 text-muted-foreground">
                          <span>{s.impressions.toLocaleString()} impressions</span>
                          <span className="font-medium text-foreground">{formatMoney(s.earnings)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your websites</CardTitle>
          </CardHeader>
          <CardContent>
            {websitesQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : websitesQuery.data?.data.length === 0 ? (
              <EmptyState
                icon={Globe}
                title="No websites connected"
                description="Add your first website to start monetizing your traffic."
                actionLabel="Add website"
                onAction={() => {
                  window.location.href = '/publisher/websites/new';
                }}
              />
            ) : (
              <ul className="space-y-3">
                {websitesQuery.data?.data.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/publisher/websites/${w.id}`}
                      className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-accent"
                    >
                      <span className="truncate font-medium">{w.domain}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
