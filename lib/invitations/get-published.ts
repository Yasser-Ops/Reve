import { restGet } from '@/lib/rest';
import {
  entitlementsSchema,
  invitationContentSchema,
  themeSchema,
  type Entitlements,
  type InvitationContent,
  type Theme,
} from '@/lib/schemas/invitation';

type PublishedInvitationRow = {
  slug: string;
  template_slug: string;
  content: unknown;
  theme: unknown;
  entitlements: unknown;
  published_at: string | null;
};

export type PublishedInvitation = {
  slug: string;
  templateSlug: string;
  content: InvitationContent;
  theme: Theme;
  entitlements: Entitlements;
};

/**
 * Reads through the published_invitations view, which exposes only published
 * rows and omits the manage token entirely. Stored JSON is validated on the
 * way out: bad content should crash loudly here rather than render a broken
 * invitation.
 */
export async function getPublishedInvitation(
  slug: string,
): Promise<PublishedInvitation | null> {
  const rows = await restGet<PublishedInvitationRow>(
    `published_invitations?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
  );

  const row = rows.at(0);
  if (!row) return null;

  return {
    slug: row.slug,
    templateSlug: row.template_slug,
    content: invitationContentSchema.parse(row.content),
    theme: themeSchema.parse(row.theme),
    entitlements: entitlementsSchema.parse(row.entitlements),
  };
}
