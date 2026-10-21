'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { UNEXPECTED, type ActionResult } from '@/lib/admin/action-result';
import { accountState, hasPaidOrder } from '@/lib/admin/invite-state';
import { mintAuthLink, recordEmail } from '@/lib/auth/auth-email';
import { requireAdmin } from '@/lib/auth/guards';
import { EmailSendError, sendEmail } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates';
import { ROUTES, adminRoutes } from '@/lib/routes';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const EMAIL_EXISTS = 'email_exists';
const TOO_MANY_EMAILS = 'Too many emails just now. Try again in a minute.';
/* The account exists by then, so the client shows as invited and the button
   becomes "send again": the operator's next step is exactly that. */
const SEND_FAILED = 'The account is ready but the email did not go out. Send it again.';

const inviteSchema = z.object({ clientId: z.uuid() });

/** Sends the invite email, and words a failure for the admin form. */
async function deliver(to: string, name: string, url: string): Promise<ActionResult> {
  try {
    await sendEmail(inviteEmail({ to, name, url }));
  } catch (error) {
    if (error instanceof EmailSendError && error.reason === 'rate-limited') {
      return { ok: false, message: TOO_MANY_EMAILS };
    }
    console.error('Invite email failed', error);
    return { ok: false, message: SEND_FAILED };
  }
  await recordEmail(createAdminClient(), to, 'invite');
  return { ok: true };
}

/**
 * Invites a client to the portal, or sends an invited client the email again.
 * The link is minted with the service role and mailed from our own template;
 * the `user_id` write goes through the admin's own session, where the clients
 * RLS policy applies.
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
    .select('id, email, full_name, user_id, terms_accepted_at, orders(tier, status)')
    .eq('id', input.data.clientId)
    .maybeSingle();
  if (error || !client) return { ok: false, message: UNEXPECTED };

  const state = accountState(client);
  if (state === 'active') return { ok: false, message: 'They already have an account.' };

  const admin = createAdminClient();

  if (state === 'invited') {
    /* A recovery link reaches the same welcome page without making a second
       user: the welcome step is wherever a client without accepted terms
       lands. */
    const link = await mintAuthLink(admin, {
      type: 'recovery',
      email: client.email,
      next: ROUTES.PORTAL_WELCOME,
    });
    if ('error' in link) return { ok: false, message: UNEXPECTED };
    return deliver(client.email, client.full_name, link.url);
  }

  if (!hasPaidOrder(client.orders)) return { ok: false, message: 'Invite them once their payment is in.' };

  const link = await mintAuthLink(admin, {
    type: 'invite',
    email: client.email,
    next: ROUTES.PORTAL_WELCOME,
  });
  if ('error' in link) {
    if (link.error.code === EMAIL_EXISTS) {
      return {
        ok: false,
        message: 'That email already has an account. Check it is not an admin address.',
      };
    }
    return { ok: false, message: UNEXPECTED };
  }

  const linked = await supabase
    .from('clients')
    .update({ user_id: link.userId })
    .eq('id', client.id)
    .is('user_id', null)
    .select('id');

  /* No row updated means another invite got there first. Either way this user
     belongs to nobody: remove it rather than leave an orphan sign-in. Nothing
     has been emailed yet, so there is no link in anyone's inbox to break. */
  if (linked.error || !linked.data?.length) {
    const removed = await admin.auth.admin.deleteUser(link.userId);
    if (removed.error) {
      console.error(`Auth user ${link.userId} was invited but could not be linked or removed`);
      return {
        ok: false,
        message:
          'The account was made but could not be saved, and could not be removed. Delete it under Supabase Auth.',
      };
    }
    return { ok: false, message: UNEXPECTED };
  }

  revalidatePath(adminRoutes.client(client.id));
  return deliver(client.email, client.full_name, link.url);
}
