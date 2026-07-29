'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { AuthCard } from '@/components/layout/auth-card';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/errors';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('This verification link is missing its token.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err instanceof ApiClientError ? err.message : 'Verification failed. Please try again.');
      });
  }, [token]);

  if (status === 'verifying') {
    return (
      <AuthCard title="Verifying your email">
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Please wait a moment…</p>
        </div>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard title="Email verified">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Your email has been verified. You can now log in.</p>
          <Button asChild className="mt-2 w-full">
            <Link href="/login">Go to login</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Verification failed">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <XCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Link href="/login" className="mt-2 text-sm font-medium text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  // useSearchParams() requires a Suspense boundary in the App Router —
  // without this, `next build` fails with a de-opt-to-client-render
  // error on this route.
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
