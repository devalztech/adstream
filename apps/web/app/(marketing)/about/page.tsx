import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — AdStream',
  description: 'AdStream connects advertisers with publishers in a fast, transparent marketplace.',
};

export default function AboutPage() {
  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-4xl font-semibold tracking-tight">About AdStream</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          AdStream is an advertising marketplace built on a simple idea: advertisers want to reach audiences, and
          publishers want to monetize the audiences they already have. AdStream connects the two directly, with a
          transparent wallet, real-time analytics, and no unnecessary complexity in between.
        </p>
        <p>
          Advertisers create campaigns, set a budget, and target the audience that matters to them. Publishers
          register their websites, verify ownership, and place ad units where they make sense for their layout.
          Every impression and click is tracked and reflected in both sides&apos; dashboards as it happens.
        </p>
        <p>We built AdStream to be fast, lightweight, and easy to use — a platform that gets out of the way.</p>
      </div>
    </div>
  );
}
