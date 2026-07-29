'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { RejectDialog } from '@/components/shared/reject-dialog';
import { adminApi } from '@/lib/api/admin';
import { formatMoney } from '@/lib/money';
import type { Campaign } from '@/types/api';

type PendingCampaign = Campaign & { advertiser_email: string; advertiser_name: string };

const LIMIT = 20;

export default function AdminCampaignsPage() {
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'campaigns', 'pending', offset],
    queryFn: () => adminApi.listPendingCampaigns({ limit: LIMIT, offset }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'campaigns'] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveCampaign(id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectCampaign(id, reason),
    onSuccess: invalidate,
  });

  const columns: DataTableColumn<PendingCampaign>[] = [
    {
      header: 'Campaign',
      cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.advertiser_email}</p>
        </div>
      ),
    },
    { header: 'Budget', cell: (c) => formatMoney(c.totalBudget, c.currency) },
    { header: 'Bid', cell: (c) => formatMoney(c.bidAmount, c.currency) },
    { header: 'Submitted', cell: (c) => new Date(c.createdAt).toLocaleDateString() },
    {
      header: 'Actions',
      cell: (c) => (
        <div className="flex gap-2">
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline">
                Approve
              </Button>
            }
            title="Approve this campaign?"
            description={`"${c.name}" will go live and start serving ads immediately.`}
            onConfirm={async () => {
              await approveMutation.mutateAsync(c.id);
            }}
          />
          <RejectDialog
            trigger={
              <Button size="sm" variant="outline">
                Reject
              </Button>
            }
            title="Reject this campaign?"
            description={`Explain why "${c.name}" is being rejected — the advertiser will see this.`}
            onConfirm={async (reason) => {
              await rejectMutation.mutateAsync({ id: c.id, reason });
            }}
          />
        </div>
      ),
    },
  ];

  const rows = (query.data ?? []) as PendingCampaign[];

  return (
    <div>
      <PageHeader title="Campaign moderation" description="Review campaigns awaiting approval." />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Megaphone}
        emptyTitle="Nothing to review"
        emptyDescription="No campaigns are currently awaiting approval."
      />

      {/* This endpoint returns a plain array with no total count (see
          INTEGRATION_MAP.md) — a simple next-page-if-full-page control
          instead of fabricating a total for the DataTable's pagination prop. */}
      {(rows.length === LIMIT || offset > 0) && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={rows.length < LIMIT} onClick={() => setOffset(offset + LIMIT)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
