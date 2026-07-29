import Link from 'next/link';
import type { Metadata } from 'next';
import { Globe, LayoutGrid, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Monetize with AdStream',
  description: 'Turn your website traffic into revenue with flexible ad placements and fast payouts.',
};

const FEATURES = [
  { icon: Globe, title: 'Website management', description: 'Register and verify as many websites as you own.' },
  { icon: LayoutGrid, title: 'Ad units', description: 'Choose from banner, native, responsive, and more formats.' },
  { icon: TrendingUp, title: 'Revenue tracking', description: 'See impressions, clicks, and earnings in real time.' },
  {
    icon: DollarSign,
    title: 'Withdrawals',
    description: 'Cash out your earnings to your bank account whenever you like.',
  },
];

export default function PublishersPage() {
  return (
    <div className="container py-16">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Monetize your traffic.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Add your website, place an ad unit, and start earning from your existing audience.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/register">Become a publisher</Link>
        </Button>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardContent className="p-6">
              <div className="inline-flex rounded-lg bg-secondary/10 p-2.5 text-secondary">
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
