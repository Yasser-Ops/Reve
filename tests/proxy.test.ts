// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { config } from '@/proxy';
import { PRIVATE_ROUTE_PATTERNS } from '@/lib/routes';

describe('proxy', () => {
  /* Next reads `config.matcher` statically, so proxy.ts must spell the
     patterns out as literals. This keeps that copy honest. */
  it('runs on exactly the private routes', () => {
    expect(config.matcher).toEqual([...PRIVATE_ROUTE_PATTERNS]);
  });

  /* The guest's invitation must never wait on an auth round trip. */
  it('never runs on a public invitation or the storefront', () => {
    for (const pattern of config.matcher) {
      expect(pattern.startsWith('/i/')).toBe(false);
      expect(pattern.startsWith('/weddings')).toBe(false);
    }
  });
});
