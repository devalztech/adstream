import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Target, Wallet, BarChart3, Globe, LayoutGrid, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'AdStream — Connect Advertisers. Empower Publishers.',
  description:
    'AdStream is an advertising marketplace where advertisers reach audiences and publishers monetize their traffic.',
  openGraph: {
    title: 'AdStream — Connect Advertisers. Empower Publishers.',
    description: 'The advertising marketplace connecting advertisers with publishers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdStream — Connect Advertisers. Empower Publishers.',
    description: 'The advertising marketplace connecting advertisers with publishers.',
  },
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="container py-20 text-center sm:py-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn attention into growth.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Advertisers reach the right audiences. Publishers monetize their traffic. AdStream connects both sides
          with a fast, transparent marketplace.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">
              Start advertising
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Become a publisher</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="container">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">How AdStream works</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-primary">For advertisers</h3>
              <ol className="mt-4 space-y-4">
                <Step n={1} title="Create campaign" description="Set your budget, creative, and destination." />
                <Step n={2} title="Choose audience" description="Target by country, device, category, and more." />
                <Step n={3} title="Fund campaign" description="Deposit funds securely to start running ads." />
                <Step n={4} title="Track results" description="Real-time impressions, clicks, and spend." />
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-medium uppercase tracking-wide text-secondary">For publishers</h3>
              <ol className="mt-4 space-y-4">
                <Step n={1} title="Add website" description="Register your website or app in minutes." />
                <Step n={2} title="Verify property" description="Confirm ownership with a meta tag or file." />
                <Step n={3} title="Create ad unit" description="Choose a format and get your embed code." />
                <Step n={4} title="Earn from traffic" description="Get paid for impressions and clicks." />
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Built for both sides</h2>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Target}
            title="Precise targeting"
            description="Reach the right audience by country, device, category, and platform."
          />
          <FeatureCard
            icon={Wallet}
            title="Transparent wallet"
            description="Fund campaigns and track every transaction with a clear, auditable ledger."
          />
          <FeatureCard
            icon={BarChart3}
            title="Real-time analytics"
            description="Impressions, clicks, CTR, CPC, and spend — updated as they happen."
          />
          <FeatureCard
            icon={Globe}
            title="Easy site verification"
            description="Verify ownership with a meta tag or file upload in minutes."
          />
          <FeatureCard
            icon={LayoutGrid}
            title="Flexible ad formats"
            description="Banner, native, responsive, and more — pick what fits your layout."
          />
          <FeatureCard
            icon={DollarSign}
            title="Fast payouts"
            description="Request withdrawals to your bank account when you're ready."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary py-16">
        <div className="container text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
            Ready to get started?
          </h2>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">Start advertising</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/register">Become a publisher</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
        {n}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Target;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="inline-flex rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
