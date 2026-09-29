// @vitest-environment node
import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';
import { PRIVATE_ROUTE_PATTERNS } from '@/lib/routes';

describe('next.config headers', () => {
  it('marks every private route noindex', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];

    for (const pattern of PRIVATE_ROUTE_PATTERNS) {
      const rule = rules.find((candidate) => candidate.source === pattern);
      expect(rule?.headers).toContainEqual({
        key: 'X-Robots-Tag',
        value: 'noindex, nofollow',
      });
    }
  });
});
