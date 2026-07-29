'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { notificationsApi } from '@/lib/api/notifications';

const LIMIT = 20;

/**
 * The notifications list is identical for every role — same API, same
 * layout — so it's one shared component rendered by each role's
 * app/<role>/notifications/page.tsx rather than three near-duplicates.
 */
export function NotificationsPageContent() {
  const [offset, setOffset] = useState(0);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', 'list', offset],
    queryFn: () => notificationsApi.list({ limit: LIMIT, offset }),
  });

  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    invalidateAll();
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    invalidateAll();
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates about your account activity."
        action={
          <Button variant="outline" onClick={handleMarkAllRead}>
            <Check className="h-4 w-4" />
            Mark all as read
          </Button>
        }
      />

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.data.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      ) : (
        <ul className="space-y-2">
          {query.data?.data.map((n) => (
            <li
              key={n.id}
              className={cn(
                'flex items-start justify-between gap-4 rounded-lg border border-border p-4',
                !n.read_at && 'bg-primary/5'
              )}
            >
              <div>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read_at && (
                <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)} className="shrink-0">
                  Mark read
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {query.data && (query.data.meta?.total ?? 0) > LIMIT && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + LIMIT >= (query.data.meta?.total ?? 0)}
            onClick={() => setOffset(offset + LIMIT)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
