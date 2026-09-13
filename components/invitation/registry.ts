import type { ReactNode } from 'react';
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

export type TemplateEntry = {
  /** URL segment, and the key stored on an invitation row. */
  slug: string;
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
    preview: '/collection/lin/card.webp',
    component: Lin,
  },
} as const satisfies Record<string, TemplateEntry>;

export type TemplateSlug = keyof typeof REGISTRY;

export const TEMPLATES: readonly TemplateEntry[] = Object.values(REGISTRY);

export const TEMPLATE_SLUGS: readonly string[] = Object.keys(REGISTRY);

export function getTemplate(slug: string): TemplateComponent | null {
  return REGISTRY[slug as TemplateSlug]?.component ?? null;
}

export function getTemplateEntry(slug: string): TemplateEntry | undefined {
  return REGISTRY[slug as TemplateSlug];
}
