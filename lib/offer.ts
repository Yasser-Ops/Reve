import { TIERS, type Tier } from '@/lib/constants';

/**
 * What Rêve sells, in one place.
 *
 * The home page's pricing table and every design's product page quote the same
 * figures and the same promises. Keeping them here means a price change is one
 * edit, and it is not possible for a product page to advertise a tier the
 * pricing section prices differently.
 *
 * NOTHING IN THIS FILE MAY OUTRUN THE PRODUCT. Every line is a claim a customer
 * can hold Rêve to, so a feature belongs here once it exists, not once it is
 * planned. Ratings and couple counts are deliberately absent: Rêve is
 * pre-launch and has none to report.
 */

export type OfferTier = {
  tier: Tier;
  name: string;
  price: string;
  summary: string;
  includes: readonly string[];
  /** Button label on the home page's pricing table. */
  cta: string;
  /** The one tier the pricing table lifts. Exactly one may be true. */
  featured: boolean;
};

export const OFFER_TIERS: readonly OfferTier[] = [
  {
    tier: TIERS.BASIC,
    name: 'Basic',
    price: '$50',
    summary: 'A live invitation page at your own link.',
    includes: [
      'Your own web address',
      'Animated envelope and wax seal',
      'Countdown to the day',
      'Photo gallery',
      'Share on WhatsApp',
    ],
    cta: 'Start with Basic',
    featured: false,
  },
  {
    tier: TIERS.MANAGED,
    name: 'Managed',
    price: '$100',
    summary: 'Everything in Basic, plus replies you can actually track.',
    includes: [
      'Everything in Basic',
      'RSVP collection',
      'Guest list with headcount',
      'Private dashboard link',
      'Export your list',
    ],
    cta: 'Start with Managed',
    featured: true,
  },
  {
    tier: TIERS.CUSTOM,
    name: 'Custom',
    price: '$200',
    summary: 'A design made for you, from scratch.',
    includes: [
      'Everything in Managed',
      'Original art direction',
      'Your colours and typography',
      'Arabic calligraphy on request',
      'Direct line to the designer',
    ],
    cta: 'Talk to us',
    featured: false,
  },
];

/**
 * What ordering a design actually involves.
 *
 * Deliberately short. A drawn design is finished before it is bought, so there
 * is no brief to write and no draft to wait for — which is the whole reason the
 * turnaround below can be what it is.
 */
export const HOW_IT_WORKS: readonly { title: string; body: string }[] = [
  {
    title: 'Choose your design',
    body: 'Open the live demo and read the whole invitation before you pay for anything.',
  },
  {
    title: 'Send us your details',
    body: 'Your names, the date, the venue, and the order of the day, over WhatsApp.',
  },
  {
    title: 'We set them into the design',
    body: 'The artwork is already drawn. Your details are set into the spaces it leaves for them.',
  },
  {
    title: 'You get your link',
    body: 'One address that opens on any phone. Send it to everyone you are inviting.',
  },
];

/**
 * The turnaround Rêve commits to on a ready-drawn design.
 *
 * This is the honest advantage over a bespoke studio: there is no design phase
 * to wait through, because the design already exists. It is a promise, so it is
 * stated in days and kept conservative — and it applies to the tiers whose
 * artwork is finished, never to Custom.
 */
export const DELIVERY = {
  headline: 'Ready in 48 hours',
  detail:
    'The artwork is already drawn, so there is no design wait. Send your details and your invitation is live within two days.',
  /** Custom is a design made from scratch and cannot honour the same promise. */
  excludesTier: TIERS.CUSTOM,
} as const;

/** The lowest price any ready-drawn design is sold at. */
export const ENTRY_TIER = OFFER_TIERS[0];
