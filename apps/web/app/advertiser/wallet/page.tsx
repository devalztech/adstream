'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DepositDialog } from '@/components/wallet/deposit-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { walletsApi } from '@/lib/api/wallets';
import { formatMoney } from '@/lib/money';

export default function AdvertiserWalletPage() {
  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: walletsApi.getMyWallet });
  const transactionsQuery = useQuery({
    queryKey: ['wallet', 'transactions', 'recent'],
    queryFn: () => walletsApi.getMyTransactions({ limit: 5 }),
  });

  return (
    <div>
      <PageHeader title="Wallet" description="Fund your wallet to run campaigns." action={<DepositDialog />} />

      {walletQuery.isLoading ? (
        <StatCardSkeleton />
      ) : walletQuery.isError ? (
        <ErrorState message={walletQuery.error.message} onRetry={() => walletQuery.refetch()} />
      ) : walletQuery.data ? (
        <div className="max-w-xs">
          <StatCard label="Wallet balance" value={formatMoney(walletQuery.data.balance, walletQuery.data.currency)} />
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent transactions</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/advertiser/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {transactionsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : transactionsQuery.data?.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactionsQuery.data?.data.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={tx.status} />
                    <span className={tx.amount >= 0 ? 'font-medium text-success' : 'font-medium text-destructive'}>
                      {tx.amount >= 0 ? '+' : ''}
                      {formatMoney(tx.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
