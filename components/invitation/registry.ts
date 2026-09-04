import type { ReactNode } from 'react';
import { CapBlanc } from '@/components/invitation/templates/cap-blanc';
import { Nuit } from '@/components/invitation/templates/nuit';
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
    character: ['Ivory ground', 'Centred', 'Understated'],
    component: CapBlanc,
  },
  nuit: {
    slug: 'nuit',
    name: 'Nuit',
    summary: 'An evening invitation. Dark ground, gold rule, details set in a column.',
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
