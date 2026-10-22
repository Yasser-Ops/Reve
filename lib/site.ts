/**
 * The site's own address, in one place.
 *
 * Every absolute URL Rêve needs to hand out — canonicals, Open Graph, the
 * sitemap — is built from this, so a domain change is one edit rather than a
 * search through every metadata block that resolved a relative path against
 * whatever host happened to be serving the request.
 *
 * Falls back to the Vercel preview URL in review deployments, and to
 * localhost in dev, so `metadataBase` is never left pointing at production
 * from a branch preview.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  'http://localhost:3000'
).replace(/\/$/, '');

/**
 * The host as people read it, for copy that shows a link rather than one that
 * resolves it (the WhatsApp illustration, "your own link"). Unlike SITE_URL it
 * never changes per environment: a preview deployment should still show the
 * address a couple will actually get.
 */
export const PUBLIC_HOST = 'reveinvitations.com';

/** Where a couple's invitation lives, by slug. */
export function invitationPath(slug: string) {
  return `/i/${slug}`;
}

/** The published sample every "live example" link opens. Named for the
    couple in lib/sample-invitation, so every demo on the site is one wedding. */
export const LIVE_EXAMPLE_PATH = invitationPath('malik-and-sara');
