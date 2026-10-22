import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LISTED_TEMPLATES, TEMPLATES } from '@/components/invitation/registry';
import { FAQS } from '@/lib/faq';
import {
  catalogueJsonLd,
  designJsonLd,
  faqJsonLd,
  organizationJsonLd,
} from '@/lib/json-ld';
import { llmsTxt } from '@/lib/llms';
import {
  SITE_OG_IMAGE,
  designOgImage,
  envelopeOgImage,
  socialMetadata,
} from '@/lib/metadata';
import { OFFER_TIERS } from '@/lib/offer';

const inPublic = (path: string) => existsSync(join(process.cwd(), 'public', path));

describe('link previews', () => {
  /* A preview pointing at a file that was never rendered shows as a broken
     card in WhatsApp, with nothing in the build to say so. */
  it('has a rendered image for the site, every listed design and every envelope', () => {
    expect(inPublic(SITE_OG_IMAGE)).toBe(true);
    for (const entry of LISTED_TEMPLATES) expect(inPublic(designOgImage(entry.slug)), entry.slug).toBe(true);
    for (const entry of TEMPLATES) expect(inPublic(envelopeOgImage(entry.slug)), entry.slug).toBe(true);
  });

  it('always carries an image, as a large card', () => {
    const social = socialMetadata({ title: 't', description: 'd' });

    expect(social.openGraph?.images).toEqual([expect.objectContaining({ url: SITE_OG_IMAGE })]);
    expect(social.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});

describe('structured data', () => {
  it('marks up every question the home page answers, word for word', () => {
    const data = faqJsonLd(FAQS);

    expect(data.mainEntity).toHaveLength(FAQS.length);
    expect(data.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: FAQS[0].question,
      acceptedAnswer: { '@type': 'Answer', text: FAQS[0].answer },
    });
  });

  it('points every block at the one organisation', () => {
    const { '@id': id } = organizationJsonLd();
    const catalogue = catalogueJsonLd({ metaTitle: 't', metaDescription: 'd', href: '/weddings' });
    const design = designJsonLd({ name: 'n', story: 's', href: '/weddings/lin', image: '/x.jpg' });

    expect(catalogue.provider['@id']).toBe(id);
    expect(design.creator['@id']).toBe(id);
  });

  it('prices a catalogue across the tiers it sells on', () => {
    const { offers } = catalogueJsonLd({ metaTitle: 't', metaDescription: 'd', href: '/weddings' });
    const amounts = OFFER_TIERS.map((tier) => tier.amount);

    expect(offers.lowPrice).toBe(Math.min(...amounts));
    expect(offers.highPrice).toBe(Math.max(...amounts));
    expect(offers.offers).toHaveLength(OFFER_TIERS.length);
  });
});

describe('the offer and its copy', () => {
  it('shows each price as its amount', () => {
    for (const tier of OFFER_TIERS) expect(tier.price).toBe(`$${tier.amount}`);
  });

  /* House style: no em-dash used as a pivot mid-sentence in customer copy. */
  it('answers questions without mid-sentence em-dashes', () => {
    for (const item of FAQS) expect(item.answer, item.question).not.toMatch(/\S\s—\s\S/);
  });
});

describe('llms.txt', () => {
  it('states every price and answers every question', () => {
    const text = llmsTxt();

    for (const tier of OFFER_TIERS) expect(text).toContain(tier.price);
    for (const item of FAQS) expect(text).toContain(item.answer);
  });
});
