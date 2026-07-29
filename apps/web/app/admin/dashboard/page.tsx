'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Users, Megaphone, Globe, Banknote, DollarSign, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin';
import { formatMoney } from '@/lib/money';

export default function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform-wide overview." />

      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Advertisers" value={query.data.totalAdvertisers.toLocaleString()} icon={Users} />
          <StatCard label="Publishers" value={query.data.totalPublishers.toLocaleString()} icon={Users} />
          <StatCard label="Active campaigns" value={query.data.activeCampaigns.toLocaleString()} icon={Megaphone} />
          <StatCard label="Approved websites" value={query.data.approvedWebsites.toLocaleString()} icon={Globe} />
          <StatCard label="Revenue (30 days)" value={formatMoney(query.data.revenueLast30Days)} icon={DollarSign} />
          <StatCard label="Total wallet balances" value={formatMoney(query.data.totalWalletBalances)} icon={Wallet} />
          <StatCard label="Pending campaigns" value={query.data.pendingCampaigns.toLocaleString()} icon={Megaphone} />
          <StatCard label="Pending websites" value={query.data.pendingWebsites.toLocaleString()} icon={Globe} />
        </div>
      ) : null}

      {query.data &&
        (query.data.pendingCampaigns > 0 || query.data.pendingWebsites > 0 || query.data.pendingWithdrawals > 0) && (
          <Card className="mt-6 border-warning/30 bg-warning/5">
            <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
              <span className="font-medium">Needs your attention:</span>
              {query.data.pendingCampaigns > 0 && (
                <Link href="/admin/campaigns" className="text-primary hover:underline">
                  {query.data.pendingCampaigns} campaign{query.data.pendingCampaigns === 1 ? '' : 's'} pending
                  approval
                </Link>
              )}
              {query.data.pendingWebsites > 0 && (
                <Link href="/admin/websites" className="text-primary hover:underline">
                  {query.data.pendingWebsites} website{query.data.pendingWebsites === 1 ? '' : 's'} pending approval
                </Link>
              )}
              {query.data.pendingWithdrawals > 0 && (
                <Link href="/admin/withdrawals" className="text-primary hover:underline">
                  <Banknote className="mr-1 inline h-3.5 w-3.5" />
                  {query.data.pendingWithdrawals} withdrawal{query.data.pendingWithdrawals === 1 ? '' : 's'} pending
                </Link>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
