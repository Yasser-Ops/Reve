'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { accountState, hasPaidOrder } from '@/lib/admin/invite-state';
import { requireAdmin } from '@/lib/auth/guards';
import { ROUTES, adminRoutes, confirmUrl } from '@/lib/routes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMailClient } from '@/lib/supabase/mailer';
import { createClient } from '@/lib/supabase/server';

const EMAIL_EXISTS = 'email_exists';
const EMAIL_RATE_LIMIT = 'over_email_send_rate_limit';
const TOO_MANY_EMAILS = 'Too many emails just now. Try again in a minute.';
const TOO_MANY_REQUESTS = 429;

const inviteSchema = z.object({ clientId: z.uuid() });

function sendFailure(error: { code?: string; status?: number }): string {
  return error.code === EMAIL_RATE_LIMIT || error.status === TOO_MANY_REQUESTS
    ? TOO_MANY_EMAILS
    : UNEXPECTED;
}

/**
 * Invites a client to the portal, or sends an invited client the email again.
 * The auth call needs the service role; the `user_id` write goes through the
 * admin's own session, where the clients RLS policy applies.
 */
export async function inviteClient(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const input = inviteSchema.safeParse({ clientId: formData.get('clientId') });
  if (!input.success) return { ok: false, message: 'Check the details.' };

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, email, user_id, terms_accepted_at, orders(tier, status)')
    .eq('id', input.data.clientId)
    .maybeSingle();
  if (error || !client) return { ok: false, message: UNEXPECTED };

  const redirectTo = confirmUrl(ROUTES.PORTAL_WELCOME);
  const state = accountState(client);

  if (state === 'active') return { ok: false, message: 'They already have an account.' };

  if (state === 'invited') {
    /* A recovery email reaches the same welcome page without making a second
       user. It goes from a throwaway implicit-flow client, not the cookie one:
       that would leave a PKCE verifier in the admin's cookies. */
    const resent = await createMailClient().auth.resetPasswordForEmail(client.email, {
      redirectTo,
    });
    if (resent.error) return { ok: false, message: sendFailure(resent.error) };
    return { ok: true };
  }

  if (!hasPaidOrder(client.orders)) return { ok: false, message: 'Invite them once their payment is in.' };

  const admin = createAdminClient();
  const invited = await admin.auth.admin.inviteUserByEmail(client.email, { redirectTo });
  if (invited.error || !invited.data.user) {
    if (invited.error?.code === EMAIL_EXISTS) {
      return {
        ok: false,
        message: 'That email already has an account. Check it is not an admin address.',
      };
    }
    return { ok: false, message: invited.error ? sendFailure(invited.error) : UNEXPECTED };
  }

  const userId = invited.data.user.id;
  const linked = await supabase
    .from('clients')
    .update({ user_id: userId })
    .eq('id', client.id)
    .is('user_id', null)
    .select('id');

  /* No row updated means another invite got there first. Either way this user
     belongs to nobody: remove it rather than leave an orphan sign-in. */
  if (linked.error || !linked.data?.length) {
    const removed = await admin.auth.admin.deleteUser(userId);
    if (removed.error) {
      console.error(`Auth user ${userId} was invited but could not be linked or removed`);
      return {
        ok: false,
        message:
          'The invite went out but could not be saved, and its sign-in could not be removed. Delete it under Supabase Auth.',
      };
    }
    return { ok: false, message: UNEXPECTED };
  }

  revalidatePath(adminRoutes.client(client.id));
  return { ok: true };
}
