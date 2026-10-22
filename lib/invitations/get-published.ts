import { getTemplateEntry } from '@/components/invitation/registry';
import { restGet } from '@/lib/rest';
import type { CoreContent } from '@/lib/schemas/content/core';
import {
  entitlementsSchema,
  themeSchema,
  type Entitlements,
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
  content: CoreContent;
  theme: Theme;
  entitlements: Entitlements;
};

/**
 * Reads through public.get_published_invitation (0014), which returns the one
 * published row for this slug and nothing without it: a public key can open an
 * invitation it holds the link to, never list them. The manage token is never
 * among its columns. Stored JSON is validated on the
 * way out, content against its design's OWN schema: bad content should crash
 * loudly here rather than render a broken invitation.
 */
export async function getPublishedInvitation(
  slug: string,
): Promise<PublishedInvitation | null> {
  const rows = await restGet<PublishedInvitationRow>(
    `rpc/get_published_invitation?p_slug=${encodeURIComponent(slug)}`,
  );

  const row = rows.at(0);
  if (!row) return null;

  /* An invitation naming a design the code no longer has is a 404, the same
     as one that does not exist. Content is parsed with that design's OWN
     schema, so a field the design needs and the row lacks fails here, loudly,
     rather than rendering a gap. */
  const design = getTemplateEntry(row.template_slug);
  if (!design) return null;

  return {
    slug: row.slug,
    templateSlug: row.template_slug,
    content: design.schema.parse(row.content),
    theme: themeSchema.parse(row.theme),
    entitlements: entitlementsSchema.parse(row.entitlements),
  };
}
