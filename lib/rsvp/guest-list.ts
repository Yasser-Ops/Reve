import type { Database } from '@/lib/supabase/database.types';

export type RsvpRow = Pick<
  Database['public']['Tables']['rsvps']['Row'],
  'name' | 'attending' | 'party_size' | 'dietary_notes' | 'message' | 'created_at'
>;

export type GuestReply = {
  name: string;
  attending: boolean;
  partySize: number;
  dietaryNotes: string | null;
  message: string | null;
  repliedAt: string;
  earlierReplies: number;
};

export type GuestListSummary = {
  guests: GuestReply[];
  coming: number;
  declined: number;
  replies: number;
};

// One guest can reply more than once and may retype their name, so identity is the
// normalised name. NFC first so composed and decomposed accents match.
function normaliseName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

/** Latest reply per guest wins; an exact timestamp tie goes to the later row. */
export function summariseReplies(rows: RsvpRow[]): GuestListSummary {
  const byGuest = new Map<string, { row: RsvpRow; time: number; count: number }>();

  for (const row of rows) {
    const key = normaliseName(row.name);
    const time = Date.parse(row.created_at);
    const seen = byGuest.get(key);
    if (!seen) {
      byGuest.set(key, { row, time, count: 1 });
    } else {
      seen.count += 1;
      if (time >= seen.time) {
        seen.row = row;
        seen.time = time;
      }
    }
  }

  const guests: GuestReply[] = [...byGuest.values()]
    .map(({ row, count }) => ({
      name: row.name,
      attending: row.attending,
      partySize: row.party_size,
      dietaryNotes: row.dietary_notes,
      message: row.message,
      repliedAt: row.created_at,
      earlierReplies: count - 1,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const coming = guests.reduce((sum, g) => (g.attending ? sum + g.partySize : sum), 0);
  const declined = guests.filter((g) => !g.attending).length;

  return { guests, coming, declined, replies: rows.length };
}
