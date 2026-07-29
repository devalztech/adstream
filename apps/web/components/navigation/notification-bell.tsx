'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { notificationsApi } from '@/lib/api/notifications';
import { cn } from '@/lib/utils';

/**
 * Polls the real /notifications endpoint every 60s for the unread
 * count and latest 5 — no fake badge numbers. If the request fails
 * (e.g. logged out), the badge simply doesn't render rather than
 * showing a stale or fabricated count.
 *
 * `viewAllHref` is passed in by the layout rather than hardcoded here,
 * since this component is shared across the advertiser/publisher/admin
 * topbars and each has its own /<role>/notifications page.
 */
export function NotificationBell({ viewAllHref }: { viewAllHref: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications', 'preview'],
    queryFn: () => notificationsApi.list({ limit: 5 }),
    refetchInterval: 60_000,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.meta?.unreadCount ?? 0;

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-1.5 text-sm font-medium">Notifications</div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={() => !n.read_at && handleMarkRead(n.id)}
              className={cn('flex-col items-start gap-0.5 whitespace-normal', !n.read_at && 'bg-primary/5')}
            >
              <span className="text-sm font-medium">{n.title}</span>
              <span className="text-xs text-muted-foreground">{n.message}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={viewAllHref} className="justify-center text-sm text-primary">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
