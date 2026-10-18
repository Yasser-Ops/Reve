import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * A throwaway anon client for sending auth emails on someone else's behalf.
 * The implicit flow keeps PKCE out of it: the cookie client would store a code
 * verifier in the admin's cookies, and the recipient's browser, which has no
 * verifier, could not exchange the `?code=` the email carries. No storage and
 * no cookies, so it never touches the admin's session.
 */
export function createMailClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'implicit',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
