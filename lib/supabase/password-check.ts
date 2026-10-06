import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Whether `password` is the account's password, checked on a throwaway client
 * with no cookies and no storage. Signing in on the cookie client would swap
 * the browser's session and leave the old one alive; here the session the
 * check creates is revoked at once (`scope: 'local'` ends only that one).
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const throwaway = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  const { error } = await throwaway.auth.signInWithPassword({ email, password });
  if (error) return false;

  await throwaway.auth.signOut({ scope: 'local' });
  return true;
}
