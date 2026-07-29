'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { walletsApi } from '@/lib/api/wallets';
import { formatMoney } from '@/lib/money';
import type { Transaction } from '@/types/api';

const LIMIT = 20;

export default function TransactionsPage() {
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ['wallet', 'transactions', offset],
    queryFn: () => walletsApi.getMyTransactions({ limit: LIMIT, offset }),
  });

  const columns: DataTableColumn<Transaction>[] = [
    { header: 'Type', cell: (tx) => <span className="capitalize">{tx.type.replace('_', ' ')}</span> },
    {
      header: 'Amount',
      cell: (tx) => (
        <span className={tx.amount >= 0 ? 'font-medium text-success' : 'font-medium text-destructive'}>
          {tx.amount >= 0 ? '+' : ''}
          {formatMoney(tx.amount)}
        </span>
      ),
    },
    { header: 'Balance after', cell: (tx) => formatMoney(tx.balanceAfter) },
    { header: 'Status', cell: (tx) => <StatusBadge status={tx.status} /> },
    {
      header: 'Reference',
      cell: (tx) => <span className="text-xs text-muted-foreground">{tx.reference ?? '—'}</span>,
    },
    { header: 'Date', cell: (tx) => new Date(tx.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader title="Transactions" description="Your full wallet transaction history." />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(tx) => tx.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Receipt}
        emptyTitle="No transactions yet"
        emptyDescription="Once you deposit funds or run campaigns, your transactions will appear here."
        pagination={{ offset, limit: LIMIT, total: query.data?.meta?.total ?? 0, onPageChange: setOffset }}
      />
    </div>
  );
}
