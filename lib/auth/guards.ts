import 'server-only';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/admin-membership';
import { LOGIN_NOTICE, NOTICE_PARAM, ROUTES } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';

export type AdminIdentity = {
  userId: string;
  email: string;
};

/**
 * The first line of every admin page, layout and action.
 *
 * Called in the PAGE as well as the layout: a layout does not re-run on
 * client navigation between its children, so a layout-only check lets a
 * revoked admin keep browsing. `getClaims()` verifies the JWT locally against
 * the project's keys; `getSession()` is never trusted for this.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (!claims) redirect(ROUTES.ADMIN_LOGIN);

  if (!(await isAdmin(supabase, claims.sub))) {
    redirect(
      `${ROUTES.ADMIN_LOGIN}?${NOTICE_PARAM}=${LOGIN_NOTICE.NOT_ADMIN}`,
    );
  }

  return { userId: claims.sub, email: claims.email ?? '' };
}
