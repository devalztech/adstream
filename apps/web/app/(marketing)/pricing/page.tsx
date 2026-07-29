import Link from 'next/link';
import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Pricing — AdStream',
  description: 'How AdStream pricing works for advertisers and publishers.',
};

export default function PricingPage() {
  return (
    <div className="container py-16">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Simple, usage-based pricing.</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          No monthly fees. You only pay for what you use.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>For advertisers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Set your own budget and bid amount. You&apos;re only charged as your ads are actually served — deposit
              what you want to spend, and campaign spend is deducted from your wallet in real time.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                No minimum spend to get started
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Full control over total and daily budgets
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Pause or stop a campaign at any time
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>For publishers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Free to add websites and create ad units. AdStream takes a percentage of advertiser spend as its fee —
              publishers earn the rest, credited to their wallet as ads are served on their sites.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                No cost to register or verify a website
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Withdraw earnings to your bank account
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Track every impression and click in real time
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <Button asChild size="lg">
          <Link href="/register">Get started</Link>
        </Button>
      </div>
    </div>
  );
}
