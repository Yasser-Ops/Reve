import { env } from '@/lib/env';

/**
 * Raw PostgREST GET with the anon key.
 *
 * Public invitation reads deliberately bypass supabase-js: a stale session in
 * the SDK must never be able to stall the one page whose whole job is to open
 * instantly from a WhatsApp link.
 */
export async function restGet<T>(path: string): Promise<T[]> {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PostgREST request failed (${response.status}): ${path}`);
  }

  return (await response.json()) as T[];
}
