'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
import { toSmallestUnit } from '@/lib/money';
import { ApiClientError } from '@/lib/api/errors';
import type { PaymentProvider } from '@/types/api';

const PROVIDERS: Array<{ value: PaymentProvider; label: string }> = [
  { value: 'paystack', label: 'Paystack' },
  { value: 'flutterwave', label: 'Flutterwave' },
];

/**
 * Implements the deposit flow exactly as specced: enter amount → choose
 * provider → continue payment (redirect to the provider's checkout) →
 * verification happens after the user returns, never assumed here. This
 * component only calls initiateDeposit and redirects — it never marks
 * anything as paid; that's the backend's job via webhook + the
 * deposit/verify endpoint the callback page calls.
 */
export function DepositDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<PaymentProvider>('paystack');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => paymentsApi.initiateDeposit(toSmallestUnit(Number(amount)), provider),
    onSuccess: (result) => {
      window.location.href = result.authorizationUrl;
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Could not start the deposit. Please try again.');
    },
  });

  const numericAmount = Number(amount);
  const isValidAmount = amount.trim() !== '' && !Number.isNaN(numericAmount) && numericAmount > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add funds</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add funds to your wallet</DialogTitle>
          <DialogDescription>Choose an amount and payment provider to continue.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="deposit-amount">Amount (₦)</Label>
            <Input
              id="deposit-amount"
              type="number"
              step="0.01"
              min="0"
              className="mt-1.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <Label>Payment provider</Label>
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
          <Button
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
            disabled={!isValidAmount || mutation.isPending}
          >
            {mutation.isPending ? 'Redirecting…' : 'Continue to payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
