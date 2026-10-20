import { describe, expect, it } from 'vitest';
import { toGuestCsv } from '@/lib/rsvp/csv';
import type { GuestReply } from '@/lib/rsvp/guest-list';

function guest(over: Partial<GuestReply>): GuestReply {
  return {
    name: 'Maya Haddad',
    attending: true,
    partySize: 2,
    dietaryNotes: null,
    message: null,
    repliedAt: '2026-10-20T10:00:00Z',
    earlierReplies: 0,
    ...over,
  };
}

const BOM = '\uFEFF';
const HEADER = 'Name,Coming,Guests,Dietary notes,Message,Replied at';

describe('toGuestCsv', () => {
  it('starts with a BOM and the header, and uses CRLF', () => {
    const csv = toGuestCsv([guest({})]);
    expect(csv.startsWith(BOM + HEADER + '\r\n')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(2);
  });

  it('writes Yes with the party size and No with 0', () => {
    const lines = toGuestCsv([guest({}), guest({ name: 'B', attending: false, partySize: 4 })]).split('\r\n');
    expect(lines[1]).toBe('Maya Haddad,Yes,2,,,2026-10-20 13:00');
    expect(lines[2]).toBe('B,No,0,,,2026-10-20 13:00');
  });

  it('formats Replied at in the studio zone with a 24-hour midnight', () => {
    const lines = toGuestCsv([guest({ repliedAt: '2026-01-10T22:05:00Z' })]).split('\r\n');
    expect(lines[1].endsWith('2026-01-11 00:05')).toBe(true);
  });

  it('quotes fields with commas, quotes and newlines', () => {
    const csv = toGuestCsv([guest({ dietaryNotes: 'no nuts, no dairy', message: 'Say "hi"\nsoon' })]);
    expect(csv).toContain('"no nuts, no dairy","Say ""hi""\nsoon"');
  });

  it.each(['=SUM(A1)', '+1', '-2', '@cmd'])('guards a cell starting with %s', (cell) => {
    const csv = toGuestCsv([guest({ message: cell })]);
    expect(csv).toContain(`'${cell}`);
  });

  it('keeps Arabic names intact', () => {
    const csv = toGuestCsv([guest({ name: 'سارة الحداد' })]);
    expect(csv.split('\r\n')[1].startsWith('سارة الحداد,Yes')).toBe(true);
  });
});
