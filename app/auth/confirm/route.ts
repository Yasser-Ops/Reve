import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_LINK_TYPES } from '@/lib/auth/links';
import { createClient } from '@/lib/supabase/server';
import {
  NOTICE_PARAM,
  PORTAL_NOTICE,
  ROUTES,
  safeNext,
} from '@/lib/routes';

const QuerySchema = z.object({
  next: z.string().optional(),
  token_hash: z.string().min(1),
  type: z.enum(AUTH_LINK_TYPES),
});

/**
 * Where invite and password-reset emails land. Every link Rêve sends carries
 * a `token_hash` minted by lib/auth/auth-email.ts; it is verified here, on
 * the server, so the session cookie is set before the page the person is
 * headed to renders.
 *
 * Anything else is a link this site never sent, an old Supabase-template
 * email included, and is treated as expired: the login page offers a new one.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const query = QuerySchema.safeParse(Object.fromEntries(searchParams));

  const to = (path: string) => NextResponse.redirect(new URL(path, origin));
  const expired = () =>
    to(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`);

  if (!query.success) return expired();

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: query.data.token_hash,
    type: query.data.type,
  });
  return error ? expired() : to(safeNext(query.data.next ?? null));
}
