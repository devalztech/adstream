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

export default function AdvertiserAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const query = useQuery({
    queryKey: ['analytics', 'advertiser-overview', range],
    queryFn: () => analyticsApi.advertiserOverview(range),
  });

  return (
    <div>
      <PageHeader title="Analytics" description="Performance across all your campaigns." />

      <div className="mb-6 flex justify-end">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
            <StatCard label="Conversions" value={query.data.conversions.toLocaleString()} />
            <StatCard label="Spend" value={formatMoney(query.data.spend)} />
            <StatCard label="CTR" value={`${query.data.ctr}%`} />
            <StatCard label="CPM" value={formatMoney(query.data.cpm)} />
            <StatCard label="CPC" value={formatMoney(query.data.cpc)} />
            <StatCard label="CPA" value={formatMoney(query.data.cpa)} />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Top campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {query.data.topCampaigns.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No campaign activity in this range yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {query.data.topCampaigns.map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-6 text-muted-foreground">
                        <span>{c.impressions.toLocaleString()} impressions</span>
                        <span className="font-medium text-foreground">{formatMoney(c.spend)}</span>
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
