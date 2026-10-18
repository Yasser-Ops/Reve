// @vitest-environment node
import { readFileSync } from 'node:fs';
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

/* next.config.ts is transpiled without the `@/` alias, so anything routes.ts
   imports breaks `next build` at config load. Vitest resolves the alias and
   would never notice, hence this source check. */
describe('lib/routes.ts', () => {
  it('has no import statements', () => {
    const source = readFileSync('lib/routes.ts', 'utf8');
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});
