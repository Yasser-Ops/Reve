import { SITE_URL } from '@/lib/site';

/**
 * Structured data, built once per shape rather than hand-typed on every page.
 *
 * schema.org has no TypeScript types of its own worth pulling in for six
 * fields, so these return plain objects and each caller stringifies its own
 * — but the shape and the organization block are decided here, once, so two
 * pages cannot describe Rêve differently.
 */

const ORGANIZATION = {
  '@type': 'Organization',
  name: 'Rêve',
  url: SITE_URL,
} as const;

/**
 * A catalogue page: a service, not a product. Nothing here is bought off a
 * shelf — every design is available on every tier, and the tier is what sets
 * the price — so `Product` would misdescribe it as one fixed offer.
 */
export function catalogueJsonLd(entry: { metaTitle: string; metaDescription: string; href: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: entry.metaTitle,
    description: entry.metaDescription,
    url: `${SITE_URL}${entry.href}`,
    provider: ORGANIZATION,
    areaServed: { '@type': 'Country', name: 'Lebanon' },
    availableLanguage: ['en', 'ar'],
  };
}

/** One design, described as a CreativeWork carried by the service above. */
export function designJsonLd(entry: {
  name: string;
  story: string;
  href: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: entry.name,
    description: entry.story,
    url: `${SITE_URL}${entry.href}`,
    creator: ORGANIZATION,
  };
}
