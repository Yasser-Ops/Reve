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
