'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Megaphone, Globe } from 'lucide-react';
import { AuthCard } from '@/components/layout/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/field-error';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/useAuth';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth';
import { ApiClientError } from '@/lib/api/errors';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'advertiser' },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      await registerUser({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        role: values.role,
        companyName: values.companyName,
      });
      // Registration doesn't return a session — email verification is
      // expected first (see INTEGRATION_MAP.md). Redirect to login with
      // a message rather than pretending we logged them in.
      router.push('/login?registered=1');
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <AuthCard title="Create your account" description="Choose how you'll use AdStream.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <Label>I am a…</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('role', 'advertiser')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-md border p-4 text-sm transition-colors',
                selectedRole === 'advertiser'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input text-muted-foreground hover:bg-accent'
              )}
            >
              <Megaphone className="h-5 w-5" />
              Advertiser
            </button>
            <button
              type="button"
              onClick={() => setValue('role', 'publisher')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-md border p-4 text-sm transition-colors',
                selectedRole === 'publisher'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-input text-muted-foreground hover:bg-accent'
              )}
            >
              <Globe className="h-5 w-5" />
              Publisher
            </button>
          </div>
          <FieldError message={errors.role?.message} />
        </div>

        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="name" className="mt-1.5" {...register('fullName')} />
          <FieldError message={errors.fullName?.message} />
        </div>

        <div>
          <Label htmlFor="companyName">Company name (optional)</Label>
          <Input id="companyName" autoComplete="organization" className="mt-1.5" {...register('companyName')} />
          <FieldError message={errors.companyName?.message} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" className="mt-1.5" {...register('email')} />
          <FieldError message={errors.email?.message} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="mt-1.5"
            {...register('password')}
          />
          <FieldError message={errors.password?.message} />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
