'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/field-error';
import { Skeleton } from '@/components/ui/skeleton';
import { usersApi } from '@/lib/api/users';
import { ApiClientError } from '@/lib/api/errors';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name').max(255),
  companyName: z.string().max(255).optional(),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

/**
 * Shared across advertiser/publisher/admin settings pages — profile
 * editing (PATCH /users/me) is identical regardless of role. Anything
 * role-specific (e.g. a future notification-preferences section) can
 * be added as extra children passed in, without duplicating this form.
 */
export function SettingsPageContent() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const profileQuery = useQuery({ queryKey: ['profile'], queryFn: usersApi.getMe });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (profileQuery.data) {
      reset({ fullName: profileQuery.data.fullName, companyName: profileQuery.data.companyName ?? '' });
    }
  }, [profileQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: () => {
      setSuccessMessage('Profile updated.');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err) => {
      setErrorMessage(err instanceof ApiClientError ? err.message : 'Could not update your profile.');
      setSuccessMessage(null);
    },
  });

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account details." />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {profileQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profileQuery.data?.email ?? ''} disabled className="mt-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed here.</p>
              </div>

              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" className="mt-1.5" {...register('fullName')} />
                <FieldError message={errors.fullName?.message} />
              </div>

              <div>
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" className="mt-1.5" {...register('companyName')} />
                <FieldError message={errors.companyName?.message} />
              </div>

              {successMessage && <p className="text-sm text-success">{successMessage}</p>}
              {errorMessage && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {errorMessage}
                </p>
              )}

              <Button type="submit" disabled={isSubmitting || mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
