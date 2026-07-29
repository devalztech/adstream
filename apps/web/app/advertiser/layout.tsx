import type { ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout role="advertiser">{children}</DashboardLayout>;
}
