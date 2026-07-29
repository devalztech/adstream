import type { MetadataRoute } from 'next';

/**
 * Disallows every dashboard route — advertiser/publisher/admin pages
 * are private, authenticated views and shouldn't be crawled or
 * indexed (spec section 38).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://adstream.example.com';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/advertiser/',
        '/publisher/',
        '/admin/',
        '/login',
        '/register',
        '/reset-password',
        '/verify-email',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
