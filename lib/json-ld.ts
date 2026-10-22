import { CONTACT } from '@/lib/contact';
import type { FaqItem } from '@/lib/faq';
import { CURRENCY, OFFER_TIERS } from '@/lib/offer';
import { SITE_URL } from '@/lib/site';

/**
 * Structured data, built once per shape rather than hand-typed on every page.
 *
 * schema.org has no TypeScript types of its own worth pulling in for a few
 * fields, so these return plain objects and <JsonLd> serialises them. The
 * organisation is described in full once, on the home page, under a stable
 * @id; every other block points at that id, so no two pages can describe Rêve
 * differently.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const LEBANON = { '@type': 'Country', name: 'Lebanon' } as const;
const LANGUAGES = ['en', 'ar'] as const;

/** A reference to the organisation, for the blocks that name it. */
const ORGANIZATION_REF = { '@id': ORGANIZATION_ID, '@type': 'Organization', name: 'Rêve', url: SITE_URL } as const;

/** Who Rêve is: the entity every other block, and every AI answer, hangs on. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'Rêve',
    alternateName: 'Rêve Invitations',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    image: `${SITE_URL}/og.jpg`,
    description:
      'A small studio in Lebanon designing digital invitations by hand for weddings, engagements, birthdays and anniversaries, in English and Arabic.',
    areaServed: LEBANON,
    sameAs: [CONTACT.instagramUrl],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: CONTACT.whatsappNumber.replace(/\s/g, ''),
      availableLanguage: LANGUAGES,
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'Rêve',
    url: SITE_URL,
    inLanguage: 'en',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/** The questions the home page answers, exactly as it shows them. */
export function faqJsonLd(items: readonly FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/**
 * The tiers as offers. Every design sells on every tier, so the price range of
 * a catalogue is the range of the tiers.
 */
function offersJsonLd() {
  const amounts = OFFER_TIERS.map((tier) => tier.amount);

  return {
    '@type': 'AggregateOffer',
    priceCurrency: CURRENCY,
    lowPrice: Math.min(...amounts),
    highPrice: Math.max(...amounts),
    offerCount: OFFER_TIERS.length,
    offers: OFFER_TIERS.map((tier) => ({
      '@type': 'Offer',
      name: tier.name,
      description: tier.summary,
      price: tier.amount,
      priceCurrency: CURRENCY,
    })),
  };
}

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
    provider: ORGANIZATION_REF,
    areaServed: LEBANON,
    availableLanguage: LANGUAGES,
    offers: offersJsonLd(),
  };
}

/** One design, described as a CreativeWork carried by the service above. */
export function designJsonLd(entry: {
  name: string;
  story: string;
  href: string;
  image: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: entry.name,
    description: entry.story,
    url: `${SITE_URL}${entry.href}`,
    image: `${SITE_URL}${entry.image}`,
    creator: ORGANIZATION_REF,
  };
}
