import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_ENTRIES,
  CATALOGUES,
  OCCASIONS,
  TEMPLATES,
  getCatalogue,
  templatesForOccasion,
} from '@/components/invitation/registry';

const ALL_SECTIONS = CATALOGUE_ENTRIES.flatMap((entry) => entry.sections);

describe('the catalogues', () => {
  it('has an entry for every catalogue', () => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(getCatalogue(catalogue)).toBeDefined();
    }
  });

  /* A design shelved under an occasion no catalogue renders would vanish from
     both pages while still having a product page of its own. */
  it('leaves no design unreachable', () => {
    const reachable = ALL_SECTIONS.flatMap((section) =>
      templatesForOccasion(section.occasion).map((entry) => entry.slug),
    );

    expect([...reachable].sort()).toEqual(
      TEMPLATES.map((entry) => entry.slug).sort(),
    );
  });

  it('shelves every occasion exactly once across the two halves', () => {
    const shelved = ALL_SECTIONS.map((section) => section.occasion);

    expect(new Set(shelved).size).toBe(shelved.length);
    expect([...shelved].sort()).toEqual(Object.values(OCCASIONS).sort());
  });

  /* The two halves are told apart by their accent. If both signed in the same
     colour the split would be invisible, which is most of its point. */
  it('gives the two halves different accents', () => {
    const accents = CATALOGUE_ENTRIES.map((entry) => entry.accent);
    expect(new Set(accents).size).toBe(accents.length);
  });

  it('gives each half its own route', () => {
    const hrefs = CATALOGUE_ENTRIES.map((entry) => entry.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('carries the copy each page and its metadata need', () => {
    for (const entry of CATALOGUE_ENTRIES) {
      expect(entry.metaTitle.length).toBeGreaterThan(0);
      expect(entry.metaDescription.length).toBeGreaterThan(0);
      expect(entry.standfirst.length).toBeGreaterThan(0);
      expect(entry.sections.length).toBeGreaterThan(0);
    }
  });

  /* The heading is rendered as `heading` then `headingAccent` in italic. If
     the accent were repeated inside the heading it would read twice. */
  it('does not repeat the heading accent inside the heading', () => {
    for (const entry of CATALOGUE_ENTRIES) {
      expect(entry.heading).not.toContain(entry.headingAccent);
    }
  });
});
