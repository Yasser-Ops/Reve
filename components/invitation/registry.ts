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

/**
 * The seam that makes templates pluggable: adding one means adding a directory
 * and a single entry here. Nothing else in the system changes.
 */
const REGISTRY: Record<string, TemplateComponent> = {
  'cap-blanc': CapBlanc,
  nuit: Nuit,
};

export const TEMPLATE_SLUGS: readonly string[] = Object.keys(REGISTRY);

export function getTemplate(slug: string): TemplateComponent | null {
  return REGISTRY[slug] ?? null;
}
