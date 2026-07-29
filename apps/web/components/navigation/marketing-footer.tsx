import Link from 'next/link';

const FOOTER_LINKS = {
  Product: [
    { href: '/advertise', label: 'Advertise' },
    { href: '/publishers', label: 'Publishers' },
    { href: '/pricing', label: 'Pricing' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ],
  Resources: [{ href: '/faq', label: 'FAQ' }],
  Legal: [
    { href: '/privacy', label: 'Privacy' },
    { href: '/terms', label: 'Terms' },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
        {Object.entries(FOOTER_LINKS).map(([section, links]) => (
          <div key={section}>
            <h3 className="text-sm font-medium">{section}</h3>
            <ul className="mt-3 space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} AdStream. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
