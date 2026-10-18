import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NOTICE_PARAM, PORTAL_NOTICE, ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

const NoticeSchema = z.enum(PORTAL_NOTICE);

/**
 * Ends this browser's session and shows the portal login. The guard sends
 * people here instead of signing out itself: a Server Component cannot write
 * cookies, so a sign-out during render would not stick. Local scope only, so
 * other devices stay signed in. A GET that only ends your own session is not
 * worth a CSRF token.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const notice = NoticeSchema.safeParse(searchParams.get(NOTICE_PARAM));

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });

  const target = notice.success
    ? `${ROUTES.PORTAL_LOGIN}?${NOTICE_PARAM}=${notice.data}`
    : ROUTES.PORTAL_LOGIN;
  return NextResponse.redirect(new URL(target, origin));
}
