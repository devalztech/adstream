'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants/nav';
import { useAuth } from '@/lib/auth/useAuth';
import type { Role } from '@/types/api';

/**
 * A left-side drawer built directly on the Dialog primitive rather than
 * the full <Dialog> wrapper component — this needs slide-from-left
 * positioning and full-height sizing that the centered modal variant
 * isn't shaped for, so it's its own small composition instead of
 * fighting the modal's className defaults.
 */
export function MobileNav({ role }: { role: Extract<Role, 'advertiser' | 'publisher' | 'admin'> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();
  const items = NAV_ITEMS[role];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 lg:hidden" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-border bg-card p-0 lg:hidden">
          <DialogPrimitive.Title className="flex h-16 items-center border-b border-border px-6 text-lg font-semibold text-primary">
            AdStream
          </DialogPrimitive.Title>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main navigation">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-4">
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
