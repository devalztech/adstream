import type { Metadata } from 'next';
import { AppProviders } from '@/providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AdStream — Connect Advertisers. Empower Publishers.',
    template: '%s | AdStream',
  },
  description:
    'AdStream is an advertising marketplace connecting advertisers who want to reach audiences with publishers who monetize their traffic.',
  openGraph: {
    title: 'AdStream',
    description: 'Connect Advertisers. Empower Publishers.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AdStream',
    description: 'Connect Advertisers. Empower Publishers.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
