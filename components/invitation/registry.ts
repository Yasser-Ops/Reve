import type { ReactNode } from 'react';
import { Jardin } from '@/components/invitation/templates/jardin';
import { Lin } from '@/components/invitation/templates/lin';
import type {
  Entitlements,
  InvitationContent,
  Theme,
} from '@/lib/schemas/invitation';

export type TemplateProps = {
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

export type TemplateComponent = (props: TemplateProps) => ReactNode;

/**
 * Which section of the collection a design is shelved under.
 *
 * A design belongs to exactly one occasion here. The collection page renders
 * a section per occasion, so this is what decides where a design appears and
 * nothing else needs to know about it.
 */
export const OCCASIONS = {
  WEDDING: 'wedding',
  ENGAGEMENT: 'engagement',
  CELEBRATION: 'celebration',
} as const;

export type Occasion = (typeof OCCASIONS)[keyof typeof OCCASIONS];

export type TemplateEntry = {
  /** URL segment, and the key stored on an invitation row. */
  slug: string;
  /** The section of the collection this design is shelved under. */
  occasion: Occasion;
  /** Display name, as a couple would refer to it. */
  name: string;
  /** One line on what the design is for. */
  summary: string;
  /**
   * What the artwork actually depicts, in the designer's voice.
   *
   * A design is bought on how it looks, so it is worth describing rather than
   * categorising. This is the product page's standfirst; `summary` is the
   * shorter line the collection grid uses.
   */
  story: string;
  /** The art direction in a few words, for the collection's card. */
  character: readonly string[];
  /**
   * The design as one photographed image: its envelope on a phone screen and
   * its opening page on the card beside it.
   *
   * Composed rather than assembled in CSS. The base is a photograph, so its
   * plaster ground, shadows and bezel highlights are real, and no arrangement
   * of flat layers reaches that. It is also the house format for advertising,
   * which means the collection and an ad are the same picture rather than two
   * things that drift apart.
   *
   * Built by `pnpm mockup:compose <slug>` from the design's own stills, one of
   * which is captured off the live template. Because it is a build artefact
   * rather than a drawing, a design change means recomposing: nothing here can
   * detect that the picture has gone stale.
   */
  preview: string;
  component: TemplateComponent;
  /**
   * A design mid-build (see `docs/design-roadmap.md`). Its page prerenders and
   * opens by URL so it can be reviewed, but no shelf, sitemap or "other
   * designs" row offers it, and the page itself is `noindex`. Delete the flag
   * as the roadmap's last step, once the design's own artwork and card ship.
   */
  draft?: true;
};

/**
 * The seam that makes templates pluggable: adding one means adding a directory
 * and a single entry here. Nothing else in the system changes.
 *
 * Entries carry their catalogue copy alongside their component so the
 * storefront's collection cannot list a design the renderer does not have, or
 * describe one differently from how it actually presents.
 */
const REGISTRY = {
  lin: {
    slug: 'lin',
    name: 'Lin',
    summary:
      'Your film behind your names, then sage and cream bands carrying the evening, with petals falling the length of the page.',
    story:
      'Your own film plays behind your names, and the invitation settles into sage and cream: a countdown, the venue drawn by hand, and the evening laid out as a timeline you follow as you scroll. White petals fall the whole way down.',
    character: ['Film behind the names', 'Drawn illustration', 'Falling petals'],
    occasion: OCCASIONS.WEDDING,
    preview: '/collection/lin/card.webp',
    component: Lin,
  },
  jardin: {
    slug: 'jardin',
    name: 'Jardin',
    summary:
      'A painted garden that separates as you scroll, so opening the invitation reads as walking in through the arch.',
    story:
      'A colonnade, a fountain and roses painted by hand, laid in three planes that draw apart as you scroll: the sky holds, the arches drift, the near vines leave the frame. Your names are set into the scene rather than laid over it, and the evening runs down a vine with a bloom at every hour.',
    character: ['Painted scene', 'Walks in as you scroll', 'Blush and deep rose'],
    occasion: OCCASIONS.WEDDING,
    /* Composed from the design's own stills by `pnpm mockup:compose jardin`.
       The paper half is a capture of THIS template running, taken at the
       647x1395 the base photograph's paper canvas measures, so the card shows
       the invitation a buyer actually receives rather than a drawing of it.

       RECOMPOSE WHEN THE DESIGN CHANGES. Nothing here can detect that the
       picture has gone stale — it is a build artefact, and an edit to the
       hero or the type leaves the card showing the previous design. */
    preview: '/collection/jardin/card.webp',
    component: Jardin,
  },
  /*
   * STANDING IN FOR ITS OWN ARTWORK. This entry exists so the Dentelle
   * ENVELOPE — ivory damask with a lace trim, `lib/envelopes.ts` — has a page
   * to open on; the invitation behind it is Jardin's, borrowed whole.
   *
   * The envelope is chosen by SLUG: `LiveInvitationDemo` passes `entry.slug`
   * through to `getEnvelope`, so a design named `dentelle` opens the envelope
   * named `dentelle` with nothing wiring the two together explicitly. That is
   * what makes this entry enough to see the opening.
   *
   * The copy already describes Dentelle's OWN invitation (the trousseau brief
   * in `docs/design-roadmap.md`), while the component and card are still
   * Jardin's. `draft` is what keeps that mismatch off the shelves until a
   * real component and `pnpm mockup:compose dentelle` replace them.
   */
  dentelle: {
    slug: 'dentelle',
    name: 'Dentelle',
    summary:
      "A bride's keepsake box laid out on ivory silk: your names on a letterpress card, the evening on luggage tags tied with ribbon.",
    story:
      'Under a lace-trimmed envelope and a rose-gold seal, the invitation is a trousseau photographed from above on ivory silk. Your names sit on a blank letterpress card beside a strand of pearls, the countdown is engraved inside a pocket watch, the venue is written on the back of an old postcard, and each part of the evening hangs from the ribbon on a tag you turn over to read.',
    character: ['Photographed heirlooms', 'Lace and rose-gold wax', 'Tags you turn over'],
    occasion: OCCASIONS.WEDDING,
    /* Jardin's card, borrowed with its invitation. */
    preview: '/collection/jardin/card.webp',
    component: Jardin,
    draft: true,
  },
} as const satisfies Record<string, TemplateEntry>;

export type TemplateSlug = keyof typeof REGISTRY;

export const TEMPLATES: readonly TemplateEntry[] = Object.values(REGISTRY);

/** Every design a visitor may be offered: the registry less its drafts. */
export const LISTED_TEMPLATES: readonly TemplateEntry[] = TEMPLATES.filter(
  (entry) => !entry.draft,
);

/** Every slug with a page, drafts included, so a draft opens for review. */
export const TEMPLATE_SLUGS: readonly string[] = Object.keys(REGISTRY);

export function getTemplate(slug: string): TemplateComponent | null {
  return REGISTRY[slug as TemplateSlug]?.component ?? null;
}

export function getTemplateEntry(slug: string): TemplateEntry | undefined {
  return REGISTRY[slug as TemplateSlug];
}

/**
 * The two halves of the catalogue.
 *
 * Formal and celebratory work are genuinely different art direction, not the
 * same designs relabelled: different register, different weight, a wax seal
 * against something lighter. They earn separate pages because their contents
 * differ, and each page can then speak in its own voice — and be found on its
 * own terms, which a fragment of a shared page never could.
 */
export const CATALOGUES = {
  FORMAL: 'formal',
  CELEBRATORY: 'celebratory',
} as const;

export type Catalogue = (typeof CATALOGUES)[keyof typeof CATALOGUES];

export type CatalogueSection = {
  occasion: Occasion;
  title: string;
  blurb: string;
  placeholders: number;
};

export type CatalogueEntry = {
  catalogue: Catalogue;
  /** Where the page lives. */
  href: string;
  /** Accent colour class stem: the one token that separates the two halves. */
  accent: 'wine' | 'gilt';
  title: string;
  heading: string;
  /** The heading's final words, set in the italic accent face. */
  headingAccent: string;
  standfirst: string;
  metaTitle: string;
  metaDescription: string;
  sections: readonly CatalogueSection[];
};

export const CATALOGUE_ENTRIES: readonly CatalogueEntry[] = [
  {
    catalogue: CATALOGUES.FORMAL,
    href: '/weddings',
    accent: 'wine',
    /* THE LABEL NAMES THE OCCASION, THE TITLE NAMES BOTH. "Collection" told a
       visitor the format and not the subject, and read as nothing beside
       "Celebrations" — a catalogue against an occasion, which are not two of
       the same thing. Weddings lead here, so they name the half; engagements
       are carried by the page title, the section heading and the copy, all of
       which a search engine reads and a nav label is not. */
    title: 'Weddings',
    heading: 'Weddings, and what',
    headingAccent: 'comes before',
    standfirst:
      'Invitations for the wedding and for the engagement, drawn by hand. Every design is available on every tier, at the same price, and is set with your own names, date and evening before anything is due.',
    metaTitle: 'Wedding and engagement invitations',
    metaDescription:
      'Digital wedding and engagement invitations, designed by hand in Lebanon. A live page at your own link, in English and Arabic, ready in 48 hours.',
    sections: [
      {
        occasion: OCCASIONS.WEDDING,
        title: 'Wedding invitations',
        blurb: 'Every design is set with your own names, date and evening.',
        placeholders: 3,
      },
      {
        occasion: OCCASIONS.ENGAGEMENT,
        title: 'Engagement invitations',
        blurb:
          'The same hand as the wedding, so the two read as a pair when you come back for it.',
        placeholders: 4,
      },
    ],
  },
  {
    catalogue: CATALOGUES.CELEBRATORY,
    href: '/celebrations',
    accent: 'gilt',
    title: 'Celebrations',
    heading: 'For the evenings that are',
    headingAccent: 'not weddings',
    standfirst:
      'Birthdays, anniversaries and the evenings worth an invitation of their own. The same craft, in a lighter hand.',
    metaTitle: 'Birthday and anniversary invitations',
    metaDescription:
      'Digital birthday and anniversary invitations, designed by hand in Lebanon. A live page at your own link, in English and Arabic, ready in 48 hours.',
    sections: [
      {
        occasion: OCCASIONS.CELEBRATION,
        /* Fewer placeholders than the formal page, and copy that says so.
           This half is genuinely beginning, and a shelf as long as the other
           page's would promise a catalogue that does not exist. */
        title: 'Birthdays and anniversaries',
        blurb:
          'The first of these are being drawn now. Tell us what you are planning and we will show you where it is going.',
        placeholders: 2,
      },
    ],
  },
];

export function getCatalogue(
  catalogue: Catalogue,
): CatalogueEntry | undefined {
  return CATALOGUE_ENTRIES.find((entry) => entry.catalogue === catalogue);
}

export function templatesForOccasion(
  occasion: Occasion,
): readonly TemplateEntry[] {
  return LISTED_TEMPLATES.filter((entry) => entry.occasion === occasion);
}

/**
 * Where "back" goes from a design: the catalogue that shelves its occasion,
 * and the label that names it — "Weddings", not the generic "The collection"
 * a page carrying two catalogues can no longer claim to be.
 *
 * `href` is bare (`/weddings`) when that catalogue has only the one section —
 * a fragment to the only thing on the page would scroll past its own heading,
 * the same reasoning CataloguePage's picker already follows — and fragmented
 * (`/weddings#engagement`) once it holds more than one, so a visitor who
 * opened Lin from the engagement section lands back on it rather than at the
 * top of the wedding one.
 */
export function backToCatalogue(
  occasion: Occasion,
): { href: string; label: string } {
  const entry = CATALOGUE_ENTRIES.find((catalogue) =>
    catalogue.sections.some((section) => section.occasion === occasion),
  );

  if (!entry) return { href: '/', label: 'Rêve' };

  return {
    href: entry.sections.length > 1 ? `${entry.href}#${occasion}` : entry.href,
    label: entry.title,
  };
}
