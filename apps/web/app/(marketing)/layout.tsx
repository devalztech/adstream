import type { ReactNode } from 'react';
import { MarketingNav } from '@/components/navigation/marketing-nav';
import { MarketingFooter } from '@/components/navigation/marketing-footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
