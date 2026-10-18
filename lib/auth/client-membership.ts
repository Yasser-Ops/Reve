import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export type ClientRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  terms_accepted_at: string | null;
};

/**
 * The `clients` row linked to `userId`, or null for an account that is not a
 * client (an admin, say). RLS lets a client read only their own row, so this
 * runs as them; the user_id filter just makes the intent explicit.
 */
export async function getClientForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ClientRecord | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, terms_accepted_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}
