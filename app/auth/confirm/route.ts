import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  NOTICE_PARAM,
  PORTAL_NOTICE,
  ROUTES,
  safeNext,
} from '@/lib/routes';

const OtpTypeSchema = z.enum(['invite', 'recovery', 'email']);

/**
 * Where invite and password-reset emails land. A link carrying `token_hash`
 * or `code` is verified here, on the server, so the session cookie is set
 * before the page the person is headed to renders.
 *
 * A link with neither is Supabase's default template: its verify endpoint
 * redirects here with the session in the URL fragment, which no server ever
 * sees. The browser keeps the fragment across a redirect whose Location has
 * none, so we forward to a page that can read it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get('next'));
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');

  const to = (path: string) => NextResponse.redirect(new URL(path, origin));
  const expired = () =>
    to(`${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${PORTAL_NOTICE.LINK_EXPIRED}`);

  if (tokenHash) {
    const type = OtpTypeSchema.safeParse(searchParams.get('type'));
    if (!type.success) return expired();

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type.data,
    });
    return error ? expired() : to(next);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? expired() : to(next);
  }

  return to(`${ROUTES.AUTH_SESSION}?next=${encodeURIComponent(next)}`);
}
