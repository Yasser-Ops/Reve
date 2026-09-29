import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Whether `userId` is on `admin_users`. Membership, not a JWT claim, is what
 * makes an admin: a claim would outlive a revoked admin until the token
 * expired. RLS lets a user read only their own row, so this runs as them.
 */
export async function isAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data !== null;
}
