'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Archive, Pause, Play, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { ChartCard } from '@/components/charts/chart-card';
import { RangeSelect } from '@/components/charts/range-select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { campaignsApi } from '@/lib/api/campaigns';
import { analyticsApi } from '@/lib/api/analytics';
import { formatMoney } from '@/lib/money';
import { ApiClientError } from '@/lib/api/errors';
import type { AnalyticsRange } from '@/types/api';

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [actionError, setActionError] = useState<string | null>(null);

  const campaignQuery = useQuery({
    queryKey: ['campaigns', params.id],
    queryFn: () => campaignsApi.getOne(params.id),
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics', 'campaign', params.id, range],
    queryFn: () => analyticsApi.campaignAnalytics(params.id, range),
    enabled: !!campaignQuery.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns', params.id] });

  const runAction = useMutation({
    mutationFn: (action: 'submit' | 'pause' | 'resume' | 'archive') => campaignsApi[action](params.id),
    onSuccess: invalidate,
    onError: (err) =>
      setActionError(err instanceof ApiClientError ? err.message : 'That action could not be completed.'),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => campaignsApi.duplicate(params.id),
    onSuccess: (newCampaign) => router.push(`/advertiser/campaigns/${newCampaign.id}`),
  });

  if (campaignQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }

  if (campaignQuery.isError || !campaignQuery.data) {
    return <ErrorState message={campaignQuery.error?.message} onRetry={() => campaignQuery.refetch()} />;
  }

  const campaign = campaignQuery.data;
  const canEdit = campaign.status === 'draft';

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={
          <span className="inline-flex items-center gap-2">
            <StatusBadge status={campaign.status} />
            {campaign.rejectionReason && <span className="text-destructive">— {campaign.rejectionReason}</span>}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => runAction.mutate('submit')} disabled={runAction.isPending}>
                <Send className="h-4 w-4" />
                Submit for approval
              </Button>
            )}
            {campaign.status === 'active' && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                }
                title="Pause this campaign?"
                description="Ad serving will stop immediately. You can resume it at any time."
                onConfirm={() => runAction.mutateAsync('pause')}
              />
            )}
            {campaign.status === 'paused' && (
              <Button variant="outline" onClick={() => runAction.mutate('resume')} disabled={runAction.isPending}>
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isPending}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            {['completed', 'rejected', 'paused', 'draft'].includes(campaign.status) && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                }
                title="Archive this campaign?"
                description="Archived campaigns are hidden from the active list but remain in your history."
                onConfirm={() => runAction.mutateAsync('archive')}
              />
            )}
          </div>
        }
      />

      {actionError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total budget" value={formatMoney(campaign.totalBudget, campaign.currency)} />
        <StatCard label="Spent" value={formatMoney(campaign.spentAmount, campaign.currency)} />
        <StatCard label="Bid amount" value={formatMoney(campaign.bidAmount, campaign.currency)} />
        <StatCard
          label="Remaining"
          value={formatMoney(Math.max(campaign.totalBudget - campaign.spentAmount, 0), campaign.currency)}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <RangeSelect value={range} onChange={setRange} />
      </div>

      {analyticsQuery.data && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Impressions" value={analyticsQuery.data.impressions.toLocaleString()} />
            <StatCard label="Clicks" value={analyticsQuery.data.clicks.toLocaleString()} />
            <StatCard label="CTR" value={`${analyticsQuery.data.ctr}%`} />
            <StatCard label="CPC" value={formatMoney(analyticsQuery.data.cpc, campaign.currency)} />
          </div>

          <div className="mt-6">
            <ChartCard
              title="Impressions & clicks over time"
              data={analyticsQuery.data.daily}
              xKey="date"
              series={[
                { key: 'impressions', label: 'Impressions', color: 'hsl(var(--primary))' },
                { key: 'clicks', label: 'Clicks', color: 'hsl(var(--secondary))' },
              ]}
            />
          </div>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Targeting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow
              label="Countries"
              value={campaign.targetCountries.length ? campaign.targetCountries.join(', ') : 'All'}
            />
            <DetailRow
              label="Devices"
              value={campaign.targetDevices.length ? campaign.targetDevices.join(', ') : 'All'}
            />
            <DetailRow
              label="Categories"
              value={campaign.targetCategories.length ? campaign.targetCategories.join(', ') : 'All'}
            />
            <DetailRow label="Destination" value={campaign.destinationUrl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaign.creatives?.map((creative) => (
              <div key={creative.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium capitalize">{creative.type}</p>
                {creative.headline && <p className="mt-1">{creative.headline}</p>}
                {creative.bodyText && <p className="text-muted-foreground">{creative.bodyText}</p>}
                {creative.assetUrl && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{creative.assetUrl}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium">{value}</span>
    </div>
  );
}
