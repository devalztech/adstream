import type { Metadata } from 'next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'FAQ — AdStream',
  description: 'Frequently asked questions about advertising and publishing on AdStream.',
};

const ADVERTISER_FAQS = [
  {
    q: 'How do I fund a campaign?',
    a: 'Deposit funds into your AdStream wallet via Paystack or Flutterwave, then create a campaign with your desired budget. Campaign spend is deducted from your wallet as your ads are served.',
  },
  {
    q: 'Can I pause a campaign?',
    a: 'Yes — active campaigns can be paused at any time from your campaign dashboard, and resumed later without losing your settings.',
  },
  {
    q: 'Does every campaign need approval?',
    a: 'Yes. After you submit a campaign, it goes into a pending approval state and is reviewed before going live.',
  },
];

const PUBLISHER_FAQS = [
  {
    q: 'How do I verify my website?',
    a: 'Add a meta tag or upload a small text file to your site with the token we provide, then click verify — we check automatically. A DNS TXT record option is also available but requires manual review.',
  },
  {
    q: 'When do I get paid?',
    a: 'Earnings accumulate in your wallet as your ad units serve impressions and clicks. You can request a withdrawal to your bank account at any time.',
  },
  {
    q: 'What ad formats can I use?',
    a: 'Banner, rectangle, leaderboard, sidebar, native, responsive, square, and sticky — choose whichever fits your site layout.',
  },
];

export default function FaqPage() {
  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-center text-4xl font-semibold tracking-tight">Frequently asked questions</h1>

      <Tabs defaultValue="advertisers" className="mt-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="advertisers">Advertisers</TabsTrigger>
          <TabsTrigger value="publishers">Publishers</TabsTrigger>
        </TabsList>
        <TabsContent value="advertisers">
          <div className="space-y-6">
            {ADVERTISER_FAQS.map((item) => (
              <div key={item.q}>
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="publishers">
          <div className="space-y-6">
            {PUBLISHER_FAQS.map((item) => (
              <div key={item.q}>
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
