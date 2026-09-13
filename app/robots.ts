import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Everything is crawlable except the preview route.
 *
 * /preview/[slug] is the full-screen demo iframe target — the same
 * invitation the storefront already links to from every design page, just
 * without the chrome around it. Indexing it would give search engines a
 * content-bare duplicate of a page that exists to be embedded, not found.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/preview/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
