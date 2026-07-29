import type { ReactNode } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { Topbar } from '@/components/navigation/topbar';
import { RequireRole } from './require-role';
import type { Role } from '@/types/api';

/**
 * The shared shell for /advertiser/*, /publisher/*, and /admin/* —
 * each role's layout.tsx renders this with its own role, so the
 * sidebar links, topbar settings link, and route guard are all correct
 * without duplicating the shell markup three times.
 */
export function DashboardLayout({
  role,
  children,
}: {
  role: Extract<Role, 'advertiser' | 'publisher' | 'admin'>;
  children: ReactNode;
}) {
  return (
    <RequireRole role={role}>
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <div className="flex flex-1 flex-col">
          <Topbar role={role} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </RequireRole>
  );
}
