'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { paymentsApi } from '@/lib/api/payments';
import { walletsApi } from '@/lib/api/wallets';
import { toSmallestUnit, formatMoney } from '@/lib/money';
import { ApiClientError } from '@/lib/api/errors';
import type { PaymentProvider } from '@/types/api';

const PROVIDERS: Array<{ value: PaymentProvider; label: string }> = [
  { value: 'paystack', label: 'Paystack' },
  { value: 'flutterwave', label: 'Flutterwave' },
];

/**
 * The backend requires exactly: amount, provider, and a destination
 * object of {accountNumber, accountName, bankCode} — no other payout
 * fields exist, and there's no bank-lookup/autocomplete endpoint, so
 * bankCode is a plain text field rather than a fake dropdown of banks
 * we'd have to invent (see INTEGRATION_MAP.md).
 */
export function RequestWithdrawalDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<PaymentProvider>('paystack');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: walletsApi.getMyWallet });

  const mutation = useMutation({
    mutationFn: () =>
      paymentsApi.requestWithdrawal({
        amount: toSmallestUnit(Number(amount)),
        provider,
        destination: { accountNumber, accountName, bankCode },
      }),
    onSuccess: () => {
      setOpen(false);
      setAmount('');
      setAccountNumber('');
      setAccountName('');
      setBankCode('');
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Could not submit the withdrawal request.');
    },
  });

  const numericAmount = Number(amount);
  const isValid =
    amount.trim() !== '' &&
    !Number.isNaN(numericAmount) &&
    numericAmount > 0 &&
    accountNumber.trim() !== '' &&
    accountName.trim() !== '' &&
    bankCode.trim() !== '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Request withdrawal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a withdrawal</DialogTitle>
          <DialogDescription>
            Available balance:{' '}
            {walletQuery.data ? formatMoney(walletQuery.data.balance, walletQuery.data.currency) : '—'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="wd-amount">Amount (₦)</Label>
            <Input
              id="wd-amount"
              type="number"
              step="0.01"
              min="0"
              className="mt-1.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <Label>Payout provider</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProvider(p.value)}
                  className={cn(
                    'rounded-md border p-3 text-sm font-medium transition-colors',
                    provider === p.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-input text-muted-foreground hover:bg-accent'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="account-name">Account name</Label>
            <Input
              id="account-name"
              className="mt-1.5"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="account-number">Account number</Label>
            <Input
              id="account-number"
              className="mt-1.5"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bank-code">Bank code</Label>
            <Input id="bank-code" className="mt-1.5" value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!isValid || mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
