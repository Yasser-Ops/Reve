import 'server-only';
import { summariseReplies, type GuestListSummary, type RsvpRow } from '@/lib/rsvp/guest-list';
import { createClient } from '@/lib/supabase/server';

/** PostgREST returns at most this many rows per request. */
const PAGE = 1000;

/**
 * An invitation's replies, summarised. The user's own client reads them, so RLS
 * (private.can_read_rsvps) decides: no entitlement or someone else's invitation
 * comes back as an empty list, never an error.
 *
 * Paged until a short page: a single request would silently drop everything past
 * the cap, and duplicates count toward it. The order ends on `id` so a tie on
 * `created_at` cannot shuffle rows across a page boundary.
 */
export async function getGuestList(invitationId: string): Promise<GuestListSummary> {
  const supabase = await createClient();
  const rows: RsvpRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('rsvps')
      .select('name, attending, party_size, dietary_notes, message, created_at')
      .eq('invitation_id', invitationId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return summariseReplies(rows);
}
