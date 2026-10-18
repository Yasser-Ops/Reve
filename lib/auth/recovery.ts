import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getClientForUser } from '@/lib/auth/client-membership';
import type { Database } from '@/lib/supabase/database.types';

/** How long after following the link a session may still set a password without the current one. */
export const RECOVERY_WINDOW_SECONDS = 15 * 60;

/**
 * The client who arrived through a password-recovery link, or null.
 *
 * Setting a password without knowing the current one is only safe for a
 * session that came from the emailed link, so the JWT must carry a
 * `recovery` entry in `amr` (Supabase's documented marker for it). A session
 * from a password sign-in, an admin's included (they share this origin's
 * cookies), is refused. Admins have no client row and reset through Supabase.
 *
 * The entry stays on the session for its whole life, refreshes included, so
 * it only counts while it is recent: a session that used a link last month is
 * not "holding the link" today. The string form of `amr` has no time, so it
 * never counts.
 */
export async function getRecoveryClient(
  supabase: SupabaseClient<Database>,
): Promise<{ userId: string; email: string } | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims) return null;

  const since = Date.now() / 1000 - RECOVERY_WINDOW_SECONDS;
  const recent = claims.amr?.some(
    (entry) =>
      typeof entry !== 'string' &&
      entry.method === 'recovery' &&
      typeof entry.timestamp === 'number' &&
      entry.timestamp >= since,
  );
  if (!recent) return null;

  const client = await getClientForUser(supabase, claims.sub);
  if (!client) return null;

  return { userId: claims.sub, email: claims.email ?? client.email };
}
