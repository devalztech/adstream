'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DepositDialog } from '@/components/wallet/deposit-dialog';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { paymentsApi } from '@/lib/api/payments';
import { walletsApi } from '@/lib/api/wallets';
import { formatMoney } from '@/lib/money';
import type { PaymentProvider, Transaction } from '@/types/api';

/**
 * Handles the return-from-provider leg of the deposit flow: the
 * provider redirects here with ?reference=&provider= after checkout,
 * and this calls the real /payments/deposit/verify endpoint to find
 * out what actually happened — it NEVER assumes success just because
 * the user made it back to this page (per spec section 17).
 */
function DepositVerificationBanner() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const provider = searchParams.get('provider') as PaymentProvider | null;
  const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'failed' | null>(null);

  useEffect(() => {
    if (!reference || !provider) return;
    setStatus('checking');
    paymentsApi
      .verifyDeposit(reference, provider)
      .then((result) => setStatus(result.status))
      .catch(() => setStatus('failed'));
  }, [reference, provider]);

  if (!reference || !status) return null;

  if (status === 'checking') {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verifying your payment…
      </div>
    );
  }
  if (status === 'success') {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" />
        Payment successful — your wallet has been credited.
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
        <Loader2 className="h-4 w-4" />
        Your payment is still processing. This page will not auto-update — check back shortly.
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <XCircle className="h-4 w-4" />
      This payment could not be verified as successful. If you were charged, please contact support with reference{' '}
      {reference}.
    </div>
  );
}

const LIMIT = 20;

function DepositHistory() {
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ['wallet', 'transactions', 'deposits', offset],
    queryFn: () => walletsApi.getMyTransactions({ limit: LIMIT, offset }),
    select: (result) => ({
      ...result,
      data: result.data.filter((tx) => tx.type === 'deposit'),
    }),
  });

  const columns: DataTableColumn<Transaction>[] = [
    { header: 'Amount', cell: (tx) => formatMoney(tx.amount) },
    { header: 'Status', cell: (tx) => <StatusBadge status={tx.status} /> },
    {
      header: 'Reference',
      cell: (tx) => <span className="text-xs text-muted-foreground">{tx.reference ?? '—'}</span>,
    },
    { header: 'Date', cell: (tx) => new Date(tx.createdAt).toLocaleString() },
  ];

  return (
    <DataTable
      columns={columns}
      rows={query.data?.data ?? []}
      rowKey={(tx) => tx.id}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage={query.error?.message}
      onRetry={() => query.refetch()}
      emptyIcon={CreditCard}
      emptyTitle="No deposits yet"
      emptyDescription="Add funds to your wallet to see your deposit history here."
      pagination={{ offset, limit: LIMIT, total: query.data?.meta?.total ?? 0, onPageChange: setOffset }}
    />
  );
}

export default function PaymentsPage() {
  return (
    <div>
      <PageHeader title="Payments" description="Deposit history and payment methods." action={<DepositDialog />} />

      <Suspense fallback={null}>
        <DepositVerificationBanner />
      </Suspense>

      <DepositHistory />
    </div>
  );
}
