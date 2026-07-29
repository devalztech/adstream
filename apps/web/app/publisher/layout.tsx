import type { ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function PublisherLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout role="publisher">{children}</DashboardLayout>;
}
