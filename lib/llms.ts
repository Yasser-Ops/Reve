import { CATALOGUE_ENTRIES, LISTED_TEMPLATES } from '@/components/invitation/registry';
import { CONTACT } from '@/lib/contact';
import { FAQS } from '@/lib/faq';
import { DELIVERY, OFFER_TIERS } from '@/lib/offer';
import { LIVE_EXAMPLE_PATH, SITE_URL } from '@/lib/site';

/**
 * /llms.txt: what Rêve is, in the plain Markdown AI assistants read before
 * answering about a site (https://llmstxt.org).
 *
 * Built from the same data the pages render, so a price or an answer changed
 * there is changed here, and nothing in it can outrun the product.
 */
export function llmsTxt(): string {
  const url = (path: string) => `${SITE_URL}${path}`;

  return [
    '# Rêve',
    '',
    '> A small studio in Lebanon that designs digital invitations by hand for weddings, engagements, birthdays and anniversaries, in English and Arabic. Each invitation is a live page at its own link, opened from an animated envelope, with RSVP collection and a guest list on the higher tiers. Orders are taken on WhatsApp.',
    '',
    '## Pricing',
    '',
    'One payment per invitation, no subscription. Prices in US dollars, paid by Whish.',
    '',
    ...OFFER_TIERS.map((tier) => `- ${tier.name}, ${tier.price}: ${tier.summary} Includes: ${tier.includes.join(', ')}.`),
    '',
    `${DELIVERY.headline} for a design from the collection. ${DELIVERY.detail}`,
    '',
    '## Pages',
    '',
    `- [Home](${url('/')}): how it works, pricing and questions`,
    ...CATALOGUE_ENTRIES.map((entry) => `- [${entry.metaTitle}](${url(entry.href)}): ${entry.metaDescription}`),
    ...LISTED_TEMPLATES.map((entry) => `- [${entry.name}](${url(`/weddings/${entry.slug}`)}): ${entry.summary}`),
    `- [Live example](${url(LIVE_EXAMPLE_PATH)}): a published invitation for a sample wedding`,
    `- [Terms of service](${url('/terms')})`,
    '',
    '## Questions',
    '',
    ...FAQS.flatMap((item) => [`### ${item.question}`, '', item.answer, '']),
    '## Contact',
    '',
    `- WhatsApp: ${CONTACT.whatsappNumber}`,
    `- Instagram: ${CONTACT.instagramUrl}`,
    '',
  ].join('\n');
}
