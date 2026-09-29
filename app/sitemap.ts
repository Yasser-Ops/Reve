import type { MetadataRoute } from 'next';
import { CATALOGUE_ENTRIES, LISTED_TEMPLATES } from '@/components/invitation/registry';
import { SITE_URL } from '@/lib/site';

/**
 * Every public page Rêve wants indexed, generated rather than listed.
 *
 * Design pages and catalogue pages both come from the registry, so a new
 * design or a new catalogue entry appears here with no edit to this file —
 * the same guarantee TEMPLATE_SLUGS gives generateStaticParams. Nothing here
 * is duplicated by hand, which is what a sitemap silently going stale usually
 * comes from.
 *
 * /i/[slug] (live invitations) is deliberately absent: those are guests'
 * private pages, not Rêve's marketing surface, and belong to whoever bought
 * them rather than to a public index Rêve controls. Draft designs are absent
 * too: their pages exist for review, not to be found.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...CATALOGUE_ENTRIES.map((entry) => ({
      url: `${SITE_URL}${entry.href}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ];

  const designRoutes: MetadataRoute.Sitemap = LISTED_TEMPLATES.map((template) => {
    const catalogue = CATALOGUE_ENTRIES.find((entry) =>
      entry.sections.some((section) => section.occasion === template.occasion),
    );

    return {
      url: `${SITE_URL}${catalogue?.href ?? ''}/${template.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    };
  });

  return [...staticRoutes, ...designRoutes];
}
