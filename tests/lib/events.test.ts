import { describe, expect, it } from 'vitest';
import {
  EVENT_PROMINENCE,
  EVENTS,
  LEAD_EVENTS,
  getEvent,
} from '@/lib/events';

describe('getEvent', () => {
  it('returns the entry for a known slug', () => {
    expect(getEvent('engagements')?.label).toBe('Engagements');
  });

  it('returns undefined for an occasion Rêve does not design for', () => {
    expect(getEvent('graduations')).toBeUndefined();
  });

  /* Weddings live on the home page. A /weddings route would compete with it
     for the same queries, so the registry must not produce one. */
  it('does not carry weddings, which the home page owns', () => {
    expect(getEvent('weddings')).toBeUndefined();
  });
});

describe('LEAD_EVENTS', () => {
  it('carries only lead occasions, since the nav renders from it', () => {
    expect(LEAD_EVENTS.every((e) => e.prominence === EVENT_PROMINENCE.LEAD)).toBe(
      true,
    );
  });

  it('keeps birthdays out of the main pitch', () => {
    expect(LEAD_EVENTS.map((e) => e.slug)).not.toContain('birthdays');
  });
});

describe('the registry', () => {
  it('has unique slugs, so routes cannot collide', () => {
    const slugs = EVENTS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('uses URL-safe slugs', () => {
    for (const event of EVENTS) {
      expect(event.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  /* The landing page splits the heading on this word to set it in italic.
     If it is absent the split silently renders the heading unstyled. */
  it('has a heading accent that appears in its own heading', () => {
    for (const event of EVENTS) {
      expect(event.heading).toContain(event.headingAccent);
    }
  });

  it('names its occasion in the prefilled WhatsApp message', () => {
    for (const event of EVENTS) {
      expect(event.startMessage).toMatch(/^Hello Rêve, I'd like to create an?/);
    }
  });

  it('gives every occasion the copy its page and metadata need', () => {
    for (const event of EVENTS) {
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.description.length).toBeGreaterThan(0);
      expect(event.intro.length).toBeGreaterThan(0);
      expect(event.points.length).toBeGreaterThan(0);
    }
  });
});
