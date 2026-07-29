'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { websitesApi } from '@/lib/api/websites';
import type { AdUnit, Website } from '@/types/api';

type AdUnitRow = AdUnit & { website: Pick<Website, 'id' | 'name' | 'domain'> };

/**
 * The backend has no single "all my ad units" endpoint — ad units are
 * scoped under /websites/:id/ad-units (see INTEGRATION_MAP.md). This
 * page fetches the publisher's websites, then each site's ad units, and
 * flattens the result — a real N+1 pattern, acceptable here since
 * publishers realistically have a handful of sites, not hundreds. If
 * that assumption stops holding, the fix belongs on the backend (a
 * dedicated aggregate endpoint), not in more frontend cleverness.
 */
export default function AdUnitsListPage() {
  const websitesQuery = useQuery({
    queryKey: ['websites', 'all-for-ad-units'],
    queryFn: () => websitesApi.list({ limit: 100 }),
  });

  const adUnitsQuery = useQuery({
    queryKey: ['ad-units', 'all', websitesQuery.data?.data.map((w) => w.id)],
    queryFn: async () => {
      const websites = websitesQuery.data?.data ?? [];
      const results = await Promise.all(
        websites.map(async (website) => {
          const units = await websitesApi.listAdUnits(website.id);
          return units.map(
            (unit): AdUnitRow => ({
              ...unit,
              website: { id: website.id, name: website.name, domain: website.domain },
            })
          );
        })
      );
      return results.flat();
    },
    enabled: !!websitesQuery.data,
  });

  const columns: DataTableColumn<AdUnitRow>[] = [
    {
      header: 'Ad unit',
      cell: (u) => (
        <Link
          href={`/publisher/websites/${u.website.id}`}
          className="font-medium hover:text-primary hover:underline"
        >
          {u.name}
        </Link>
      ),
    },
    { header: 'Website', cell: (u) => <span className="text-muted-foreground">{u.website.domain}</span> },
    { header: 'Format', cell: (u) => <span className="capitalize">{u.format}</span> },
    { header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
  ];

  const isLoading = websitesQuery.isLoading || adUnitsQuery.isLoading;
  const isError = websitesQuery.isError || adUnitsQuery.isError;

  return (
    <div>
      <PageHeader
        title="Ad Units"
        description="All ad placements across your websites."
        action={
          <Button asChild variant="outline">
            <Link href="/publisher/websites">Manage from websites</Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={adUnitsQuery.data ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        isError={isError}
        errorMessage={websitesQuery.error?.message ?? adUnitsQuery.error?.message}
        onRetry={() => {
          websitesQuery.refetch();
          adUnitsQuery.refetch();
        }}
        emptyIcon={LayoutGrid}
        emptyTitle="No ad units yet"
        emptyDescription="Verify a website first, then create ad units from its page to get embed codes."
      />
    </div>
  );
}
