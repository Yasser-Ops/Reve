import 'server-only';
import { summariseReplies, type GuestListSummary } from '@/lib/rsvp/guest-list';
import { createClient } from '@/lib/supabase/server';

/**
 * An invitation's replies, summarised. The user's own client reads them, so RLS
 * (private.can_read_rsvps) decides: no entitlement or someone else's invitation
 * comes back as an empty list, never an error.
 */
export async function getGuestList(invitationId: string): Promise<GuestListSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rsvps')
    .select('name, attending, party_size, dietary_notes, message, created_at')
    .eq('invitation_id', invitationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return summariseReplies(data);
}
