'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { RejectDialog } from '@/components/shared/reject-dialog';
import { adminApi } from '@/lib/api/admin';
import type { Website } from '@/types/api';

type PendingWebsite = Website & { publisher_email: string; publisher_name: string };

const LIMIT = 20;

export default function AdminWebsitesPage() {
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'websites', 'pending', offset],
    queryFn: () => adminApi.listPendingWebsites({ limit: LIMIT, offset }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'websites'] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveWebsite(id),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectWebsite(id, reason),
    onSuccess: invalidate,
  });

  const columns: DataTableColumn<PendingWebsite>[] = [
    {
      header: 'Website',
      cell: (w) => (
        <div>
          <p className="font-medium">{w.name}</p>
          <p className="text-xs text-muted-foreground">{w.domain}</p>
        </div>
      ),
    },
    { header: 'Publisher', cell: (w) => <span className="text-muted-foreground">{w.publisher_email}</span> },
    { header: 'Verified', cell: (w) => (w.verifiedAt ? new Date(w.verifiedAt).toLocaleDateString() : '—') },
    {
      header: 'Actions',
      cell: (w) => (
        <div className="flex gap-2">
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline">
                Approve
              </Button>
            }
            title="Approve this website?"
            description={`"${w.name}" will be able to serve ads once approved.`}
            onConfirm={() => approveMutation.mutateAsync(w.id)}
          />
          <RejectDialog
            trigger={
              <Button size="sm" variant="outline">
                Reject
              </Button>
            }
            title="Reject this website?"
            description={`Explain why "${w.name}" is being rejected — the publisher will see this.`}
            onConfirm={(reason) => rejectMutation.mutateAsync({ id: w.id, reason })}
          />
        </div>
      ),
    },
  ];

  const rows = (query.data ?? []) as PendingWebsite[];

  return (
    <div>
      <PageHeader title="Website moderation" description="Review verified websites awaiting approval." />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(w) => w.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Globe}
        emptyTitle="Nothing to review"
        emptyDescription="No websites are currently awaiting approval."
      />

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
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length < LIMIT}
            onClick={() => setOffset(offset + LIMIT)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
