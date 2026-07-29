'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { StatCard } from '@/components/shared/stat-card';
import { RequestWithdrawalDialog } from '@/components/publisher/request-withdrawal-dialog';
import { paymentsApi } from '@/lib/api/payments';
import { walletsApi } from '@/lib/api/wallets';
import { formatMoney } from '@/lib/money';
import type { WithdrawalRequest } from '@/types/api';

const LIMIT = 20;

export default function WithdrawalsPage() {
  const [offset, setOffset] = useState(0);

  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: walletsApi.getMyWallet });

  const query = useQuery({
    queryKey: ['withdrawals', offset],
    queryFn: () => paymentsApi.listWithdrawals({ limit: LIMIT, offset }),
  });

  const columns: DataTableColumn<WithdrawalRequest>[] = [
    { header: 'Amount', cell: (w) => formatMoney(w.amount, w.currency) },
    { header: 'Provider', cell: (w) => <span className="capitalize">{w.provider}</span> },
    { header: 'Status', cell: (w) => <StatusBadge status={w.status} /> },
    { header: 'Requested', cell: (w) => new Date(w.requested_at).toLocaleString() },
    {
      header: 'Note',
      cell: (w) => <span className="text-xs text-muted-foreground">{w.failure_reason ?? '—'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Withdrawals"
        description="Cash out your available earnings."
        action={<RequestWithdrawalDialog />}
      />

      <div className="mb-6 max-w-xs">
        <StatCard
          label="Available balance"
          value={walletQuery.data ? formatMoney(walletQuery.data.balance, walletQuery.data.currency) : '—'}
        />
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(w) => w.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Banknote}
        emptyTitle="No withdrawals yet"
        emptyDescription="Once you have earnings available, you can request a withdrawal here."
        pagination={{ offset, limit: LIMIT, total: query.data?.meta?.total ?? 0, onPageChange: setOffset }}
      />
    </div>
  );
}
