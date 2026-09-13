import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getTemplate,
  TEMPLATES,
  TEMPLATE_SLUGS,
} from '@/components/invitation/registry';

describe('template registry', () => {
  it('resolves a registered template to a component', () => {
    expect(typeof getTemplate('lin')).toBe('function');
  });

  it('returns null for an unknown slug', () => {
    expect(getTemplate('does-not-exist')).toBeNull();
  });

  it('lists lin among the registered slugs', () => {
    expect(TEMPLATE_SLUGS).toContain('lin');
  });

  it('resolves every advertised slug to a component', () => {
    for (const slug of TEMPLATE_SLUGS) {
      expect(getTemplate(slug), `slug ${slug} is unresolvable`).not.toBeNull();
    }
  });

  /* The collection card is this one image, and it is a build artefact rather
     than a drawing — `pnpm mockup:compose <slug>` writes it. A design added
     without running that would ship a card with nothing in it, so the file is
     checked on disk: a path that points at nothing fails the same way as a
     path left blank. Staleness is not detectable here, only absence. */
  it('gives every design a preview image that exists', () => {
    for (const entry of TEMPLATES) {
      expect(entry.preview, `${entry.slug} has no preview`).toMatch(/^\//);

      expect(
        existsSync(resolve(process.cwd(), 'public', entry.preview.slice(1))),
        `${entry.slug}'s preview is missing at ${entry.preview}`,
      ).toBe(true);
    }
  });
});
