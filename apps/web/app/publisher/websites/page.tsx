'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/tables/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { websitesApi } from '@/lib/api/websites';
import type { Website } from '@/types/api';

const LIMIT = 20;

export default function WebsitesListPage() {
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ['websites', 'list', offset],
    queryFn: () => websitesApi.list({ limit: LIMIT, offset }),
  });

  const columns: DataTableColumn<Website>[] = [
    {
      header: 'Website',
      cell: (w) => (
        <Link href={`/publisher/websites/${w.id}`} className="font-medium hover:text-primary hover:underline">
          {w.name}
        </Link>
      ),
    },
    { header: 'Domain', cell: (w) => <span className="text-muted-foreground">{w.domain}</span> },
    { header: 'Status', cell: (w) => <StatusBadge status={w.status} /> },
    { header: 'Added', cell: (w) => new Date(w.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader
        title="Websites"
        description="Register and manage your websites."
        action={
          <Button asChild>
            <Link href="/publisher/websites/new">Add website</Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(w) => w.id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error?.message}
        onRetry={() => query.refetch()}
        emptyIcon={Globe}
        emptyTitle="No websites connected"
        emptyDescription="Add your first website to start monetizing your traffic."
        emptyAction={{
          label: 'Add website',
          onClick: () => {
            window.location.href = '/publisher/websites/new';
          },
        }}
        pagination={{ offset, limit: LIMIT, total: query.data?.meta?.total ?? 0, onPageChange: setOffset }}
      />
    </div>
  );
}
