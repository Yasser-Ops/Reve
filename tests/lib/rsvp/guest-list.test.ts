import { describe, expect, it } from 'vitest';
import { summariseReplies, type RsvpRow } from '@/lib/rsvp/guest-list';

function row(over: Partial<RsvpRow>): RsvpRow {
  return {
    name: 'Maya Haddad',
    attending: true,
    party_size: 1,
    dietary_notes: null,
    message: null,
    created_at: '2026-10-01T10:00:00Z',
    ...over,
  };
}

describe('summariseReplies', () => {
  it('counts one guest once across spelling variants and keeps the latest', () => {
    const out = summariseReplies([
      row({ name: 'Maya Haddad', party_size: 2, created_at: '2026-10-01T10:00:00Z' }),
      row({ name: ' maya  haddad ', party_size: 3, created_at: '2026-10-02T10:00:00Z' }),
    ]);
    expect(out.guests).toHaveLength(1);
    expect(out.guests[0]).toMatchObject({ name: 'maya haddad', partySize: 3, earlierReplies: 1 });
    expect(out.replies).toBe(2);
    expect(out.coming).toBe(3);
  });

  it('does not depend on array order for the latest decision', () => {
    const out = summariseReplies([
      row({ party_size: 4, created_at: '2026-10-03T10:00:00Z' }),
      row({ party_size: 1, created_at: '2026-10-01T10:00:00Z' }),
    ]);
    expect(out.guests[0].partySize).toBe(4);
  });

  it('lets the later element win an exact tie', () => {
    const out = summariseReplies([row({ party_size: 1 }), row({ party_size: 2 })]);
    expect(out.guests[0].partySize).toBe(2);
  });

  it('sums party sizes of attending guests only', () => {
    const out = summariseReplies([
      row({ name: 'A', party_size: 2 }),
      row({ name: 'B', attending: false, party_size: 5 }),
      row({ name: 'C', party_size: 3 }),
    ]);
    expect(out.coming).toBe(5);
    expect(out.declined).toBe(1);
  });

  it('lets a later decline override an earlier yes', () => {
    const out = summariseReplies([
      row({ party_size: 2, created_at: '2026-10-01T10:00:00Z' }),
      row({ attending: false, created_at: '2026-10-02T10:00:00Z' }),
    ]);
    expect(out.coming).toBe(0);
    expect(out.declined).toBe(1);
  });

  it('never lets an invalid date beat a valid one', () => {
    const out = summariseReplies([
      row({ party_size: 2, created_at: '2026-10-01T10:00:00Z' }),
      row({ party_size: 9, created_at: 'not a date' }),
    ]);
    expect(out.guests[0].partySize).toBe(2);
  });

  it('matches names across NFC and NFD forms', () => {
    const out = summariseReplies([row({ name: 'Zo\u00e9' }), row({ name: 'Zoe\u0301' })]);
    expect(out.guests).toHaveLength(1);
  });

  it('sorts by name and handles Arabic names', () => {
    const out = summariseReplies([row({ name: 'سارة' }), row({ name: 'Zed' }), row({ name: 'Amy' })]);
    expect(out.guests.map((g) => g.name)).toEqual(['Amy', 'Zed', 'سارة']);
  });

  it('returns zeros for no replies', () => {
    expect(summariseReplies([])).toEqual({ guests: [], coming: 0, declined: 0, replies: 0 });
  });
});
