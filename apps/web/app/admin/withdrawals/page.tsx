'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { adminApi } from '@/lib/api/admin';
import { formatMoney } from '@/lib/money';
import { ApiClientError } from '@/lib/api/errors';
import type { WithdrawalRequest } from '@/types/api';

type PendingWithdrawal = WithdrawalRequest & { user_email: string; user_name: string };

const LIMIT = 20;

export default function AdminWithdrawalsPage() {
  const [offset, setOffset] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'withdrawals', 'pending', offset],
    queryFn: () => adminApi.listPendingWithdrawals({ limit: LIMIT, offset }),
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => adminApi.processWithdrawal(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
    },
    onError: (err) => {
      // The backend already reverses the wallet debit automatically if
      // the provider transfer fails — this message reflects that, so
      // the admin isn't left thinking funds vanished.
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not process this withdrawal. Funds remain in the wallet.'
      );
    },
  });

  const columns: DataTableColumn<PendingWithdrawal>[] = [
    {
      header: 'User',
      cell: (w) => (
        <div>
          <p className="font-medium">{w.user_name}</p>
          <p className="text-xs text-muted-foreground">{w.user_email}</p>
        </div>
      ),
    },
    { header: 'Amount', cell: (w) => formatMoney(w.amount, w.currency) },
    { header: 'Provider', cell: (w) => <span className="capitalize">{w.provider}</span> },
    { header: 'Destination', cell: (w) => `${w.destination.accountName} — ${w.destination.accountNumber}` },
    { header: 'Requested', cell: (w) => new Date(w.requested_at).toLocaleString() },
    {
      header: 'Actions',
      cell: (w) => (
        <ConfirmDialog
          trigger={<Button size="sm">Process payout</Button>}
          title="Process this withdrawal?"
          description={`This will initiate a real ${w.provider} transfer of ${formatMoney(w.amount, w.currency)}. This cannot be undone.`}
          onConfirm={() => processMutation.mutateAsync(w.id)}
        />
      ),
    },
  ];

  const rows = (query.data ?? []) as PendingWithdrawal[];

  return (
    <div>
      <PageHeader title="Withdrawal processing" description="Review and process pending payout requests." />

      {actionError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(w) => w.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Banknote}
        emptyTitle="Nothing to process"
        emptyDescription="No withdrawal requests are currently pending."
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
