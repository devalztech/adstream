import type { MetadataRoute } from 'next';

const PUBLIC_ROUTES = ['', '/advertise', '/publishers', '/pricing', '/about', '/faq', '/contact'];

/**
 * Only public marketing routes are listed — dashboard/private pages
 * (advertiser/publisher/admin/*) are intentionally excluded, per spec
 * section 38 ("Dashboard/private pages do not need to be indexed").
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://adstream.example.com';

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.7,
  }));
}
