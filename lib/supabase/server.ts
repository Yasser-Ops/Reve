import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

/**
 * The signed-in person's Supabase client, for Server Components, Server
 * Actions and Route Handlers. Every query runs under their JWT, so RLS is
 * the second wall behind every guard.
 *
 * Public invitation reads do NOT use this: they go through raw PostgREST in
 * lib/rest.ts so a stale session can never stall a guest's page.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* A Server Component cannot write cookies. proxy.ts refreshes the
               session before any private page renders, so a refresh attempted
               here is safe to drop. */
          }
        },
      },
    },
  );
}
