import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy — AdStream' };

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-6 text-muted-foreground">
        This page is a placeholder. Replace this content with AdStream&apos;s actual privacy policy before launching
        to real users.
      </p>
    </div>
  );
}
