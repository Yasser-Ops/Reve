import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  loadTemplate,
  TEMPLATES,
  TEMPLATE_SLUGS,
} from '@/components/invitation/registry';
import { formModel } from '@/lib/admin/content-form';
import { checklistFor } from '@/lib/schemas/content/checklist';
import { SAMPLE_CONTENT } from '@/lib/sample-invitation';

describe('template registry', () => {
  /* The sample wedding stands in for a real couple on every storefront
     preview. A design whose schema rejects it would render a preview that
     cannot exist for a customer. */
  it('parses the sample wedding with every design schema', () => {
    for (const entry of TEMPLATES) {
      expect(
        entry.schema.safeParse(SAMPLE_CONTENT).success,
        `${entry.slug} rejects the sample`,
      ).toBe(true);
    }
  });

  it('gives every field of every design an ask', () => {
    for (const entry of TEMPLATES) {
      expect(() => checklistFor(entry.schema), entry.slug).not.toThrow();
    }
  });

  /* Final review: the editor builds its form from the design's schema; one
     unlabelled field would crash the editor for every invitation of it. */
  it('gives every field of every design a label the editor can draw', () => {
    for (const entry of TEMPLATES) {
      expect(() => formModel(entry.schema), entry.slug).not.toThrow();
    }
  });

  it('loads a registered design', async () => {
    expect(typeof (await loadTemplate('lin'))).toBe('function');
  });

  it('loads nothing for an unknown slug', async () => {
    expect(await loadTemplate('does-not-exist')).toBeNull();
    expect(await loadTemplate('toString')).toBeNull();
  });

  it('lists lin among the registered slugs', () => {
    expect(TEMPLATE_SLUGS).toContain('lin');
  });

  it('resolves every advertised slug to a design', async () => {
    for (const slug of TEMPLATE_SLUGS) {
      expect(await loadTemplate(slug), `slug ${slug} is unresolvable`).not.toBeNull();
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
