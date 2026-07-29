import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  pagination?: { offset: number; limit: number; total: number; onPageChange: (offset: number) => void };
}

/**
 * The one table implementation every list view (campaigns, websites,
 * transactions, withdrawals, admin users) builds on. Backend pagination
 * only — never render an unbounded list client-side (spec section 36).
 * On mobile, stacked cards are the more usable pattern than a
 * horizontally-scrolling table for dense financial/campaign data, so
 * this renders cards under the `sm` breakpoint and the table above it.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  emptyIcon,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Once there is data, it will show up here.',
  emptyAction,
  pagination,
}: DataTableProps<T>) {
  if (isError) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.header} className="px-4 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns.length} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onClick}
      />
    );
  }

  return (
    <div>
      <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.header} className={cn('px-4 py-3 font-medium', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-accent/50">
                {columns.map((col) => (
                  <td key={col.header} className={cn('px-4 py-3', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards instead of a cramped/scrolling table */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)} className="rounded-lg border border-border bg-card p-4">
            {columns.map((col) => (
              <div key={col.header} className="flex items-center justify-between py-1 text-sm first:pt-0 last:pb-0">
                <span className="text-xs font-medium uppercase text-muted-foreground">{col.header}</span>
                <span className="text-right">{col.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {pagination && pagination.total > pagination.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.offset === 0}
              onClick={() => pagination.onPageChange(Math.max(0, pagination.offset - pagination.limit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.offset + pagination.limit >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.offset + pagination.limit)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
