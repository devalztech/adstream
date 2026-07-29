'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/field-error';
import { websitesApi } from '@/lib/api/websites';
import { ApiClientError } from '@/lib/api/errors';

const schema = z.object({
  name: z.string().min(2, 'Enter a name for this website').max(255),
  domain: z.string().min(3, 'Enter a domain, e.g. example.com'),
  category: z.string().max(100).optional(),
  verificationMethod: z.enum(['meta_tag', 'dns_txt', 'file_upload']).default('meta_tag'),
});
type FormValues = z.infer<typeof schema>;

export default function NewWebsitePage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { verificationMethod: 'meta_tag' } });

  const mutation = useMutation({
    mutationFn: websitesApi.create,
    onSuccess: (website) => router.push(`/publisher/websites/${website.id}`),
    onError: (err) => {
      setSubmitError(err instanceof ApiClientError ? err.message : 'Could not register this website.');
    },
  });

  return (
    <div>
      <PageHeader title="Add website" description="Register a website to start creating ad placements." />

      <Card className="max-w-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
            <div>
              <Label htmlFor="name">Website name</Label>
              <Input id="name" className="mt-1.5" {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input id="domain" placeholder="example.com" className="mt-1.5" {...register('domain')} />
              <p className="mt-1 text-xs text-muted-foreground">
                You can paste a full URL — we&apos;ll normalize it.
              </p>
              <FieldError message={errors.domain?.message} />
            </div>

            <div>
              <Label htmlFor="category">Category (optional)</Label>
              <Input id="category" className="mt-1.5" {...register('category')} />
            </div>

            <div>
              <Label htmlFor="verificationMethod">Verification method</Label>
              <select
                id="verificationMethod"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('verificationMethod')}
              >
                <option value="meta_tag">Meta tag (instant)</option>
                <option value="file_upload">File upload (instant)</option>
                <option value="dns_txt">DNS TXT record (manual review)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Meta tag and file upload are verified automatically. DNS TXT requires manual review by our team.
              </p>
            </div>

            {submitError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Registering…' : 'Register website'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
