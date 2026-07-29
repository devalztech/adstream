import Link from 'next/link';
import type { Metadata } from 'next';
import { Target, Wallet, BarChart3, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Advertise on AdStream',
  description: 'Reach the right audience with precise targeting, transparent budgets, and real-time analytics.',
};

const FEATURES = [
  {
    icon: Target,
    title: 'Campaign management',
    description: 'Create, pause, resume, and duplicate campaigns in a few clicks.',
  },
  { icon: Zap, title: 'Audience targeting', description: 'Target by country, device, category, and operating system.' },
  {
    icon: Wallet,
    title: 'Budget control',
    description: 'Set total and daily budgets — never spend more than you plan to.',
  },
  {
    icon: BarChart3,
    title: 'Performance tracking',
    description: 'Impressions, clicks, CTR, CPC, and CPM, updated in real time.',
  },
];

export default function AdvertisePage() {
  return (
    <div className="container py-16">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Reach your audience.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Create campaigns, set your budget, and track results — all from one dashboard.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/register">Start advertising</Link>
        </Button>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardContent className="p-6">
              <div className="inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
