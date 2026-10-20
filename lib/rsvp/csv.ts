import { STUDIO_TIME_ZONE } from '@/lib/constants';
import type { GuestReply } from '@/lib/rsvp/guest-list';

// Excel only reads UTF-8 (Arabic names) when the file opens with a BOM.
const BOM = '\uFEFF';
const EOL = '\r\n';
const COL_NAME = 'Name';
const COL_COMING = 'Coming';
const COL_GUESTS = 'Guests';
const COL_DIETARY = 'Dietary notes';
const COL_MESSAGE = 'Message';
const COL_REPLIED_AT = 'Replied at';
const HEADER = [COL_NAME, COL_COMING, COL_GUESTS, COL_DIETARY, COL_MESSAGE, COL_REPLIED_AT];
const YES = 'Yes';
const NO = 'No';
// OWASP set: a leading tab or carriage return can also start a formula in some spreadsheets.
const FORMULA_START = /^[=+\-@\t\r]/;
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
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(timestamp.formatToParts(date).map((p) => [p.type, p.value]));
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
      g.attending ? YES : NO,
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
