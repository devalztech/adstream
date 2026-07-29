'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { RangeSelect } from '@/components/charts/range-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi } from '@/lib/api/analytics';
import { formatMoney } from '@/lib/money';
import type { AnalyticsRange } from '@/types/api';

export default function PublisherAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const query = useQuery({
    queryKey: ['analytics', 'publisher-overview', range],
    queryFn: () => analyticsApi.publisherOverview(range),
  });

  return (
    <div>
      <PageHeader title="Analytics" description="Traffic and earnings across all your websites." />

      <div className="mb-6 flex justify-end">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Impressions" value={query.data.impressions.toLocaleString()} />
            <StatCard label="Clicks" value={query.data.clicks.toLocaleString()} />
            <StatCard label="Earnings" value={formatMoney(query.data.earnings)} />
            <StatCard label="Active sites" value={String(query.data.activeSites)} />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Top sites</CardTitle>
            </CardHeader>
            <CardContent>
              {query.data.topSites.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No traffic in this range yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {query.data.topSites.map((s) => (
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
        </>
      ) : null}
    </div>
  );
}
