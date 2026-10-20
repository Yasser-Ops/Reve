import { STUDIO_TIME_ZONE } from '@/lib/constants';
import type { GuestReply } from '@/lib/rsvp/guest-list';

// Excel only reads UTF-8 (Arabic names) when the file opens with a BOM.
const BOM = '\uFEFF';
const EOL = '\r\n';
const HEADER = ['Name', 'Coming', 'Guests', 'Dietary notes', 'Message', 'Replied at'];
const FORMULA_START = /^[=+\-@]/;
const NEEDS_QUOTES = /[",\r\n]/;

const timestamp = new Intl.DateTimeFormat('en-CA', {
  timeZone: STUDIO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  hourCycle: 'h23',
});

function formatRepliedAt(iso: string): string {
  const parts = Object.fromEntries(timestamp.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// A leading apostrophe stops spreadsheets from running a guest-typed value as a formula.
function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toGuestCsv(guests: GuestReply[]): string {
  const lines = guests.map((g) =>
    [
      g.name,
      g.attending ? 'Yes' : 'No',
      String(g.attending ? g.partySize : 0),
      g.dietaryNotes ?? '',
      g.message ?? '',
      formatRepliedAt(g.repliedAt),
    ]
      .map(cell)
      .join(','),
  );
  return BOM + [HEADER.join(','), ...lines].join(EOL);
}
