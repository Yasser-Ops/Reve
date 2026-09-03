import { describe, expect, it } from 'vitest';
import {
  entitlementsSchema,
  invitationContentSchema,
  themeSchema,
} from '@/lib/schemas/invitation';

const validContent = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  headline: 'We are getting married',
  message: 'Join us for the celebration.',
  venue: {
    name: 'Villa Rosa',
    addressLine: '12 Rue des Fleurs, Algiers',
    mapUrl: 'https://maps.example.com/villa-rosa',
  },
  schedule: [{ time: '17:00', title: 'Ceremony', description: 'Garden terrace' }],
  gallery: [{ src: '/photos/one.webp', alt: 'Sarah and Amine' }],
};

describe('invitationContentSchema', () => {
  it('accepts a fully populated content object', () => {
    expect(invitationContentSchema.parse(validContent)).toEqual(validContent);
  });

  it('defaults schedule and gallery to empty arrays when omitted', () => {
    const { schedule: _s, gallery: _g, ...withoutLists } = validContent;
    const parsed = invitationContentSchema.parse(withoutLists);
    expect(parsed.schedule).toEqual([]);
    expect(parsed.gallery).toEqual([]);
  });

  it('rejects a missing couple name', () => {
    const { coupleFirstName: _omitted, ...invalid } = validContent;
    expect(() => invitationContentSchema.parse(invalid)).toThrow();
  });

  it('rejects an event date that is not ISO 8601', () => {
    expect(() =>
      invitationContentSchema.parse({ ...validContent, eventDate: '12 June 2027' }),
    ).toThrow();
  });

  it('rejects initials longer than four characters', () => {
    expect(() =>
      invitationContentSchema.parse({ ...validContent, initials: 'SARAH' }),
    ).toThrow();
  });
});

describe('themeSchema', () => {
  it('applies defaults when given an empty object', () => {
    expect(themeSchema.parse({})).toEqual({ palette: 'default', motion: 'full' });
  });

  it('rejects an unknown motion value', () => {
    expect(() => themeSchema.parse({ motion: 'wild' })).toThrow();
  });
});

describe('entitlementsSchema', () => {
  it('defaults every capability to false', () => {
    expect(entitlementsSchema.parse({})).toEqual({
      rsvp: false,
      portal: false,
      gallery: false,
    });
  });

  it('preserves explicitly granted capabilities', () => {
    expect(entitlementsSchema.parse({ rsvp: true, gallery: true })).toEqual({
      rsvp: true,
      portal: false,
      gallery: true,
    });
  });
});
