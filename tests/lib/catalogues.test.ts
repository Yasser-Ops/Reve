import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_ENTRIES,
  CATALOGUES,
  LISTED_TEMPLATES,
  OCCASIONS,
  TEMPLATES,
  TEMPLATE_SLUGS,
  backToCatalogue,
  getCatalogue,
  templatesForOccasion,
} from '@/components/invitation/registry';
import sitemap from '@/app/sitemap';

const ALL_SECTIONS = CATALOGUE_ENTRIES.flatMap((entry) => entry.sections);

describe('the catalogues', () => {
  it('has an entry for every catalogue', () => {
    for (const catalogue of Object.values(CATALOGUES)) {
      expect(getCatalogue(catalogue)).toBeDefined();
    }
  });

  /* A design shelved under an occasion no catalogue renders would vanish from
     both pages while still having a product page of its own. */
  it('leaves no listed design unreachable', () => {
    const reachable = ALL_SECTIONS.flatMap((section) =>
      templatesForOccasion(section.occasion).map((entry) => entry.slug),
    );

    expect([...reachable].sort()).toEqual(
      LISTED_TEMPLATES.map((entry) => entry.slug).sort(),
    );
  });

  /* A draft is a design mid-build: its page must open by URL for review, but
     no shelf, sitemap or "other designs" row may offer it to a visitor. */
  it('keeps drafts off the shelves but reachable by slug', () => {
    const drafts = TEMPLATES.filter((entry) => entry.draft);
    const shelved = ALL_SECTIONS.flatMap((section) =>
      templatesForOccasion(section.occasion).map((entry) => entry.slug),
    );

    for (const draft of drafts) {
      expect(shelved).not.toContain(draft.slug);
      expect(LISTED_TEMPLATES).not.toContain(draft);
      expect(TEMPLATE_SLUGS).toContain(draft.slug);
    }
  });

  it('leaves drafts out of the sitemap', () => {
    const urls = sitemap().map((route) => route.url);

    for (const entry of TEMPLATES) {
      const listed = urls.some((url) => url.endsWith(`/${entry.slug}`));
      expect(listed, `${entry.slug} sitemap presence`).toBe(!entry.draft);
    }
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

describe('backToCatalogue', () => {
  /* Wedding is the only occasion whose catalogue holds more than one
     section today, so it is the one case that must carry a fragment rather
     than land a visitor at the top of the page they left. */
  it('fragments to the section when its catalogue holds more than one', () => {
    expect(backToCatalogue(OCCASIONS.WEDDING)).toEqual({
      href: '/weddings#wedding',
      label: 'Weddings',
    });
  });

  it('stays bare when its catalogue holds only the one section', () => {
    expect(backToCatalogue(OCCASIONS.CELEBRATION)).toEqual({
      href: '/celebrations',
      label: 'Celebrations',
    });
  });

  /* The label always names the catalogue a design actually returns to, never
     a generic "the collection" a page carrying two catalogues cannot claim
     to be. */
  it('every occasion in every catalogue resolves to that catalogue', () => {
    for (const entry of CATALOGUE_ENTRIES) {
      for (const section of entry.sections) {
        expect(backToCatalogue(section.occasion).label).toBe(entry.title);
      }
    }
  });
});
