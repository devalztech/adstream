'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, ExternalLink, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { AddAdUnitDialog } from '@/components/publisher/add-ad-unit-dialog';
import { websitesApi } from '@/lib/api/websites';
import { ApiClientError } from '@/lib/api/errors';
import type { VerificationMethod } from '@/types/api';

function VerificationInstructions({
  website,
}: {
  website: { verificationMethod: VerificationMethod; verificationToken: string; domain: string };
}) {
  if (website.verificationMethod === 'meta_tag') {
    return (
      <div className="space-y-2 text-sm">
        <p>
          Add this meta tag to the <code className="rounded bg-muted px-1 py-0.5">&lt;head&gt;</code> of your
          homepage:
        </p>
        <CodeBlock code={`<meta name="adstream-verification" content="${website.verificationToken}">`} />
      </div>
    );
  }
  if (website.verificationMethod === 'file_upload') {
    return (
      <div className="space-y-2 text-sm">
        <p>
          Create a file at{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            https://{website.domain}/adstream-verify-{website.verificationToken}.txt
          </code>{' '}
          containing exactly this text:
        </p>
        <CodeBlock code={website.verificationToken} />
      </div>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      DNS TXT verification requires manual review by our team. We&apos;ll email you once it&apos;s reviewed —
      there&apos;s no self-serve check for this method yet. Consider switching to meta tag or file upload for
      instant verification.
    </p>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted p-3">
      <code className="overflow-x-auto whitespace-pre text-xs">{code}</code>
      <Button variant="ghost" size="icon" className="shrink-0" onClick={handleCopy} aria-label="Copy to clipboard">
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function WebsiteDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const websiteQuery = useQuery({
    queryKey: ['websites', params.id],
    queryFn: () => websitesApi.getOne(params.id),
  });

  const verifyMutation = useMutation({
    mutationFn: () => websitesApi.verify(params.id),
    onSuccess: () => {
      setVerifyError(null);
      queryClient.invalidateQueries({ queryKey: ['websites', params.id] });
    },
    onError: (err) => {
      // The backend gives a specific, actionable reason here (token not
      // found, site unreachable, etc.) — shown verbatim, not reworded
      // into something vaguer.
      setVerifyError(err instanceof ApiClientError ? err.message : 'Verification failed. Please try again.');
    },
  });

  if (websiteQuery.isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }
  if (websiteQuery.isError || !websiteQuery.data) {
    return <ErrorState message={websiteQuery.error?.message} onRetry={() => websiteQuery.refetch()} />;
  }

  const website = websiteQuery.data;
  const isVerified = !!website.verifiedAt;

  return (
    <div>
      <PageHeader
        title={website.name}
        description={
          <span className="inline-flex items-center gap-2">
            <StatusBadge status={website.status} />
            <a
              href={`https://${website.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {website.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        }
      />

      {!isVerified && (
        <Card className="mb-6 border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base">Verify ownership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <VerificationInstructions website={website} />
            {verifyError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {verifyError}
              </p>
            )}
            {website.verificationMethod !== 'dns_txt' && (
              <Button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? 'Checking…' : "I've added it — verify now"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Ad units</CardTitle>
          {isVerified && <AddAdUnitDialog websiteId={website.id} />}
        </CardHeader>
        <CardContent>
          {!isVerified ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Verify this website to start creating ad units.
            </p>
          ) : website.adUnits && website.adUnits.length > 0 ? (
            <ul className="space-y-3">
              {website.adUnits.map((unit) => (
                <li key={unit.id} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{unit.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{unit.format}</p>
                    </div>
                    <StatusBadge status={unit.status} />
                  </div>
                  {unit.embedCode && (
                    <div className="mt-3">
                      <CodeBlock code={unit.embedCode} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={LayoutGrid}
              title="No ad units yet"
              description="Create an ad unit to get an embed code for this website."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
