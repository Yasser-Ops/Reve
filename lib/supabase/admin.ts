import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Service-role client: bypasses RLS, so it is for server code that has already
 * authorized the caller. Cookie-less and storage-less like password-check.ts,
 * so it can never pick up or leave behind a user session.
 */
export function createAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
