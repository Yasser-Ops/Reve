import type { ReactNode } from 'react';
import { CapBlanc } from '@/components/invitation/templates/cap-blanc';
import { Nuit } from '@/components/invitation/templates/nuit';
import { Verdure } from '@/components/invitation/templates/verdure';
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
  'cap-blanc': {
    slug: 'cap-blanc',
    name: 'Cap Blanc',
    summary: 'Pale, centred, and quiet. Everything sits on the page as it would on card.',
    story:
      'Ivory paper, a centred column, and nothing else. The restraint is the design: your names are the only thing on the page with any weight.',
    character: ['Ivory ground', 'Centred', 'Understated'],
    component: CapBlanc,
  },
  verdure: {
    slug: 'verdure',
    name: 'Verdure',
    summary:
      'A drawn sheet. Greenery banks the page and the details are set into the spaces the artwork leaves.',
    story:
      'Greenery banks the page and falls away between each section, so the invitation reads as one long decorated sheet. Your details are set into the spaces the artwork leaves for them.',
    character: ['Drawn artwork', 'Garden green', 'Full bleed'],
    component: Verdure,
  },
  nuit: {
    slug: 'nuit',
    name: 'Nuit',
    summary: 'An evening invitation. Dark ground, gold rule, details set in a column.',
    story:
      'An invitation for an evening wedding. The page goes dark, a gold rule divides it, and the details are set in a single quiet column beneath.',
    character: ['Dark ground', 'Gold accent', 'Ruled column'],
    component: Nuit,
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
