import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isAdmin } from '@/lib/auth/admin-membership';
import { getClientForUser } from '@/lib/auth/client-membership';
import { LOGIN_NOTICE, NOTICE_PARAM, PORTAL_NOTICE, ROUTES } from '@/lib/routes';
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
 *
 * Wrapped in React `cache()`: the layout and the page of ONE request share a
 * single check (the membership read is a round trip to Supabase), while every
 * new request, navigation or action still checks afresh.
 */
export const requireAdmin = cache(async (): Promise<AdminIdentity> => {
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
});

export type ClientIdentity = {
  userId: string;
  email: string;
  clientId: string;
  fullName: string;
  termsAcceptedAt: string | null;
};

/**
 * Signed in AND linked to a client row. Terms are not checked here, so the
 * welcome page (where they are accepted) can use it without redirecting to
 * itself. Everything else should call `requireClient`.
 *
 * An account with claims but no client row (an admin who wandered in) goes to
 * the sign-out route: a Server Component cannot write cookies, so signing out
 * here would silently not stick and the person would loop.
 */
export const requireClientAccount = cache(async (): Promise<ClientIdentity> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;

  if (!claims) redirect(ROUTES.PORTAL_LOGIN);

  const client = await getClientForUser(supabase, claims.sub);
  if (!client) {
    redirect(`${ROUTES.AUTH_SIGNOUT}?${NOTICE_PARAM}=${PORTAL_NOTICE.NOT_CLIENT}`);
  }

  return {
    userId: claims.sub,
    email: claims.email ?? client.email,
    clientId: client.id,
    fullName: client.full_name,
    termsAcceptedAt: client.terms_accepted_at,
  };
});

/**
 * The first line of every gated portal page and layout (same reasoning as
 * `requireAdmin`: a layout does not re-run on navigation). Sends a client who
 * has not accepted the terms to the welcome page.
 */
export const requireClient = cache(async (): Promise<ClientIdentity> => {
  const client = await requireClientAccount();
  if (client.termsAcceptedAt === null) redirect(ROUTES.PORTAL_WELCOME);
  return client;
});
