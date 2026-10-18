'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { accountState } from '@/lib/admin/invite-state';
import { requireAdmin } from '@/lib/auth/guards';
import { ORDER_STATUS, hasReached } from '@/lib/orders/status';
import { ROUTES, adminRoutes, confirmUrl } from '@/lib/routes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const EMAIL_EXISTS = 'email_exists';

const inviteSchema = z.object({ clientId: z.uuid() });

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
       user. It is an anon-key call: it sends mail and touches no session. */
    const resent = await supabase.auth.resetPasswordForEmail(client.email, { redirectTo });
    return resent.error ? { ok: false, message: UNEXPECTED } : { ok: true };
  }

  const paid = client.orders.some((order) =>
    hasReached(order.tier, order.status, ORDER_STATUS.PAID),
  );
  if (!paid) return { ok: false, message: 'Invite them once their payment is in.' };

  const admin = createAdminClient();
  const invited = await admin.auth.admin.inviteUserByEmail(client.email, { redirectTo });
  if (invited.error || !invited.data.user) {
    return {
      ok: false,
      message:
        invited.error?.code === EMAIL_EXISTS
          ? 'That email already has an account. Check it is not an admin address.'
          : UNEXPECTED,
    };
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
      throw new Error(`Auth user ${userId} was invited but could not be linked or removed`);
    }
    return { ok: false, message: UNEXPECTED };
  }

  revalidatePath(adminRoutes.client(client.id));
  return { ok: true };
}
