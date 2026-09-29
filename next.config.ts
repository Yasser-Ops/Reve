import type { NextConfig } from 'next';
import { PRIVATE_ROUTE_PATTERNS } from './lib/routes';

const nextConfig: NextConfig = {
  /* Header as well as metadata: a crawler that follows a leaked link to a
     redirect never sees the page's <meta robots>. */
  async headers() {
    return PRIVATE_ROUTE_PATTERNS.map((source) => ({
      source,
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }));
  },
};

export default nextConfig;
