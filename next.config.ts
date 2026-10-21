import type { NextConfig } from 'next';
import { PRIVATE_ROUTE_PATTERNS } from './lib/routes';

/*
 * Design media in public/ is served with max-age=0 by default, so a returning
 * guest revalidates every envelope frame before the seal can go live. These
 * files change only when a design is re-rendered, so a week in the browser,
 * then a background refresh, is safe. Not `immutable`: the filenames carry no
 * hash, and a re-render overwrites them in place.
 */
const DESIGN_MEDIA_PATTERNS = [
  '/envelope/:path*',
  '/invitation/:path*',
  '/collection/:path*',
] as const;

const DESIGN_MEDIA_CACHE = 'public, max-age=604800, stale-while-revalidate=2592000';

const nextConfig: NextConfig = {
  async headers() {
    return [
      /* Header as well as metadata: a crawler that follows a leaked link to a
         redirect never sees the page's <meta robots>. */
      ...PRIVATE_ROUTE_PATTERNS.map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
      ...DESIGN_MEDIA_PATTERNS.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: DESIGN_MEDIA_CACHE }],
      })),
    ];
  },
};

export default nextConfig;
