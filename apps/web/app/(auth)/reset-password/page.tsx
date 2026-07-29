'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCard } from '@/components/layout/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/field-error';
import { authApi } from '@/lib/api/auth';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation/auth';
import { ApiClientError } from '@/lib/api/errors';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setFormError('This reset link is missing its token. Please request a new one.');
      return;
    }
    setFormError(null);
    try {
      await authApi.resetPassword(token, values.newPassword);
      setSuccess(true);
    } catch (err) {
      // Covers both "invalid token" and "already used/expired" — the
      // backend's message already distinguishes these, shown as-is.
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (success) {
    return (
      <AuthCard title="Password reset">
        <p className="text-sm text-muted-foreground">
          Your password has been reset. All existing sessions have been signed out for security — please log in
          again.
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push('/login')}>
          Go to login
        </Button>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard title="Invalid link">
        <p className="text-sm text-muted-foreground">
          This password reset link is missing or malformed. Please request a new one.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" description="Choose a new password for your account.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1.5"
            {...register('newPassword')}
          />
          <FieldError message={errors.newPassword?.message} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1.5"
            {...register('confirmPassword')}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>

        {formError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams() requires a Suspense boundary in the App Router —
  // same reasoning as verify-email/page.tsx.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
