import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service — AdStream' };

export default function TermsPage() {
  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-6 text-muted-foreground">
        This page is a placeholder. Replace this content with AdStream&apos;s actual terms of service before
        launching to real users.
      </p>
    </div>
  );
}
