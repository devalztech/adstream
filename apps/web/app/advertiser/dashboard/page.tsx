'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Megaphone, Eye, MousePointerClick } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { RangeSelect } from '@/components/charts/range-select';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsApi } from '@/lib/api/analytics';
import { walletsApi } from '@/lib/api/wallets';
import { campaignsApi } from '@/lib/api/campaigns';
import { formatMoney } from '@/lib/money';
import type { AnalyticsRange } from '@/types/api';

export default function AdvertiserDashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const overviewQuery = useQuery({
    queryKey: ['analytics', 'advertiser-overview', range],
    queryFn: () => analyticsApi.advertiserOverview(range),
  });

  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: walletsApi.getMyWallet });

  const campaignsQuery = useQuery({
    queryKey: ['campaigns', 'recent'],
    queryFn: () => campaignsApi.list({ limit: 5 }),
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your advertising performance at a glance."
        action={
          <Button asChild>
            <Link href="/advertiser/campaigns/new">New campaign</Link>
          </Button>
        }
      />

      <div className="mb-6 flex justify-end">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {overviewQuery.isLoading || walletQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState message={overviewQuery.error.message} onRetry={() => overviewQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Wallet balance"
            value={walletQuery.data ? formatMoney(walletQuery.data.balance, walletQuery.data.currency) : '—'}
            icon={Wallet}
          />
          <StatCard label="Active campaigns" value={String(overviewQuery.data?.activeCampaigns ?? 0)} icon={Megaphone} />
          <StatCard label="Impressions" value={(overviewQuery.data?.impressions ?? 0).toLocaleString()} icon={Eye} />
          <StatCard
            label="Clicks"
            value={(overviewQuery.data?.clicks ?? 0).toLocaleString()}
            icon={MousePointerClick}
            trend={{ value: `${overviewQuery.data?.ctr ?? 0}% CTR`, direction: 'neutral' }}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {overviewQuery.isLoading ? (
            <ChartSkeleton />
          ) : overviewQuery.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top campaigns by spend</CardTitle>
              </CardHeader>
              <CardContent>
                {overviewQuery.data.topCampaigns.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No campaign activity in this range yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {overviewQuery.data.topCampaigns.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                        <Link
                          href={`/advertiser/campaigns/${c.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
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
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : campaignsQuery.data?.data.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                description="Create your first advertising campaign and start reaching your audience."
                actionLabel="Create campaign"
                onAction={() => {
                  window.location.href = '/advertiser/campaigns/new';
                }}
              />
            ) : (
              <ul className="space-y-3">
                {campaignsQuery.data?.data.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/advertiser/campaigns/${c.id}`}
                      className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-accent"
                    >
                      <span className="truncate font-medium">{c.name}</span>
                      <StatusBadge status={c.status} />
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
