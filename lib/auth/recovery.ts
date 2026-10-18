import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getClientForUser } from '@/lib/auth/client-membership';
import type { Database } from '@/lib/supabase/database.types';

/**
 * The client who arrived through a password-recovery link, or null.
 *
 * Setting a password without knowing the current one is only safe for a
 * session that came from the emailed link, so the JWT must carry a
 * `recovery` entry in `amr` (Supabase's documented marker for it). A session
 * from a password sign-in, an admin's included (they share this origin's
 * cookies), is refused. Admins have no client row and reset through Supabase.
 */
export async function getRecoveryClient(
  supabase: SupabaseClient<Database>,
): Promise<{ userId: string; email: string } | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  if (!claims) return null;

  if (!claims.amr?.some((entry) => (typeof entry === 'string' ? entry : entry.method) === 'recovery')) return null;

  const client = await getClientForUser(supabase, claims.sub);
  if (!client) return null;

  return { userId: claims.sub, email: claims.email ?? client.email };
}
