import { describe, expect, it } from 'vitest';
import { CATALOGUE_ENTRIES } from '@/components/invitation/registry';
import { EVENTS, getEvent } from '@/lib/events';

describe('getEvent', () => {
  it('returns the entry for a known slug', () => {
    expect(getEvent('engagements')?.label).toBe('Engagements');
  });

  it('returns undefined for an occasion Rêve does not design for', () => {
    expect(getEvent('graduations')).toBeUndefined();
  });

  /* Weddings live on the home page, which carries that pitch in full. */
  it('does not carry weddings, which the home page owns', () => {
    expect(getEvent('weddings')).toBeUndefined();
  });
});

describe('the registry', () => {
  it('has unique slugs', () => {
    const slugs = EVENTS.map((event) => event.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  /* An occasion is reached by a link into whichever half shelves it. A link
     naming a page or a section that does not exist fails silently in the
     browser, so both halves of the href are checked against the registry. */
  it('points every occasion at a section some catalogue renders', () => {
    /* A half holding one section is linked bare: the section is the page, and
       a fragment to the only thing on it would scroll past its own heading. */
    const targets = CATALOGUE_ENTRIES.flatMap((entry) => [
      entry.href,
      ...entry.sections.map((section) => `${entry.href}#${section.occasion}`),
    ]);

    for (const event of EVENTS) {
      expect(targets).toContain(event.href);
    }
  });

  it('names its occasion in the prefilled WhatsApp message', () => {
    for (const event of EVENTS) {
      expect(event.startMessage).toMatch(/^Hello Rêve, I'd like to create an?/);
    }
  });

  it('gives every occasion the copy a link needs', () => {
    for (const event of EVENTS) {
      expect(event.label.length).toBeGreaterThan(0);
      expect(event.startMessage.length).toBeGreaterThan(0);
    }
  });
});
