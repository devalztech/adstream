'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { ChartCard } from '@/components/charts/chart-card';
import { RangeSelect } from '@/components/charts/range-select';
import { Button } from '@/components/ui/button';
import { analyticsApi } from '@/lib/api/analytics';
import { formatMoney } from '@/lib/money';
import type { AnalyticsRange } from '@/types/api';

/**
 * Earnings here means analyticsApi.publisherOverview().earnings — the
 * running total computed from impressions/clicks in the selected range.
 * This is distinct from wallets.balance (what's actually withdrawable
 * right now) — see INTEGRATION_MAP.md's gaps section for why there's no
 * separate "pending vs available" split beyond that.
 */
export default function EarningsPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const query = useQuery({
    queryKey: ['analytics', 'publisher-overview', range],
    queryFn: () => analyticsApi.publisherOverview(range),
  });

  return (
    <div>
      <PageHeader
        title="Earnings"
        description="Revenue from your ad placements."
        action={
          <Button asChild>
            <Link href="/publisher/withdrawals">Withdraw</Link>
          </Button>
        }
      />

      <div className="mb-6 flex justify-end">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Earnings this period" value={formatMoney(query.data.earnings)} />
          <StatCard label="Impressions" value={query.data.impressions.toLocaleString()} />
          <StatCard label="Clicks" value={query.data.clicks.toLocaleString()} />
        </div>
      ) : null}

      <div className="mt-6">
        {query.isLoading ? (
          <ChartSkeleton />
        ) : query.data && query.data.topSites.length > 0 ? (
          <ChartCard
            title="Top sites by earnings"
            data={query.data.topSites.map((s) => ({ name: s.domain, earnings: s.earnings / 100 }))}
            xKey="name"
            series={[{ key: 'earnings', label: 'Earnings (₦)', color: 'hsl(var(--primary))' }]}
          />
        ) : null}
      </div>
    </div>
  );
}
