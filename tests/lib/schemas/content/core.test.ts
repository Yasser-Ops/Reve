import { describe, expect, it } from 'vitest';
import { coreContentSchema } from '@/lib/schemas/content/core';

const core = {
  coupleFirstName: 'Sarah',
  couplePartnerName: 'Amine',
  initials: 'SA',
  eventDate: '2027-06-12T17:00:00.000Z',
  venue: {
    name: 'Villa Rosa',
    addressLine: '12 Rue des Fleurs, Algiers',
    mapUrl: 'https://maps.example.com/villa-rosa',
  },
};

describe('coreContentSchema', () => {
  it('accepts the four things every design needs', () => {
    expect(coreContentSchema.parse(core)).toEqual(core);
  });

  it('rejects a missing couple name', () => {
    const { coupleFirstName: _omitted, ...invalid } = core;
    expect(() => coreContentSchema.parse(invalid)).toThrow();
  });

  it('rejects an event date that is not ISO 8601', () => {
    expect(() =>
      coreContentSchema.parse({ ...core, eventDate: '12 June 2027' }),
    ).toThrow();
  });

  it('rejects initials longer than four characters', () => {
    expect(() => coreContentSchema.parse({ ...core, initials: 'SARAH' })).toThrow();
  });

  it('rejects a venue without an address', () => {
    expect(() =>
      coreContentSchema.parse({ ...core, venue: { name: 'Villa Rosa' } }),
    ).toThrow();
  });
});
