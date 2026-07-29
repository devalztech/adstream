import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contact — AdStream',
  description: 'Get in touch with the AdStream team.',
};

/**
 * There's no backend endpoint for a contact form (see INTEGRATION_MAP.md
 * — the API surface is entirely advertiser/publisher/admin functionality,
 * no support/contact module), so this is a real mailto link rather than
 * a form that would submit to nothing.
 */
export default function ContactPage() {
  return (
    <div className="container max-w-xl py-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Get in touch</h1>
      <p className="mt-4 text-muted-foreground">
        Have a question about advertising, publishing, or your account? Reach out and we&apos;ll get back to you.
      </p>
      <Button asChild size="lg" className="mt-8">
        <a href="mailto:support@adstream.example.com">
          <Mail className="h-4 w-4" />
          support@adstream.example.com
        </a>
      </Button>
    </div>
  );
}
