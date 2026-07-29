'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { campaignsApi } from '@/lib/api/campaigns';
import { formatMoney } from '@/lib/money';
import type { Campaign, CampaignStatus } from '@/types/api';

const STATUS_OPTIONS: Array<{ value: CampaignStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

const LIMIT = 20;

export default function CampaignsListPage() {
  const [status, setStatus] = useState<CampaignStatus | 'all'>('all');
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ['campaigns', 'list', status, offset],
    queryFn: () => campaignsApi.list({ status: status === 'all' ? undefined : status, limit: LIMIT, offset }),
  });

  const columns: DataTableColumn<Campaign>[] = [
    {
      header: 'Campaign',
      cell: (c) => (
        <Link href={`/advertiser/campaigns/${c.id}`} className="font-medium hover:text-primary hover:underline">
          {c.name}
        </Link>
      ),
    },
    { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { header: 'Budget', cell: (c) => formatMoney(c.totalBudget, c.currency) },
    { header: 'Spent', cell: (c) => formatMoney(c.spentAmount, c.currency) },
    { header: 'Start date', cell: (c) => new Date(c.startDate).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Create and manage your advertising campaigns."
        action={
          <Button asChild>
            <Link href="/advertiser/campaigns/new">New campaign</Link>
          </Button>
        }
      />

      <div className="mb-4 flex justify-end">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as CampaignStatus | 'all');
            setOffset(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(c) => c.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Megaphone}
        emptyTitle="No campaigns yet"
        emptyDescription="Create your first advertising campaign and start reaching your audience."
        emptyAction={{
          label: 'Create campaign',
          onClick: () => {
            window.location.href = '/advertiser/campaigns/new';
          },
        }}
        pagination={{ offset, limit: LIMIT, total: query.data?.meta?.total ?? 0, onPageChange: setOffset }}
      />
    </div>
  );
}
